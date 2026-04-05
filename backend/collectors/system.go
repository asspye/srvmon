package collectors

import (
	"os"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/load"
	"github.com/shirou/gopsutil/v3/mem"
	psnet "github.com/shirou/gopsutil/v3/net"
	"srvmon/models"
)

// ─── Shared background collector ─────────────────────────────────────────────
// A single goroutine collects system metrics every 2 seconds and caches the
// result. All WebSocket clients read from this cache, avoiding concurrent
// /proc/stat reads that would cause CPU measurement interference.

var (
	metricsMu    sync.RWMutex
	metricsCache *models.SystemMetrics
)

func init() {
	// Prime the CPU baseline on first run, then start the loop.
	go func() {
		var prevSnap *netSnapshot
		for {
			m, snap := collectOnce(prevSnap)
			prevSnap = snap
			metricsMu.Lock()
			metricsCache = m
			metricsMu.Unlock()
			time.Sleep(2 * time.Second)
		}
	}()
}

// GetCachedMetrics returns the most recent system metrics snapshot.
func GetCachedMetrics() *models.SystemMetrics {
	metricsMu.RLock()
	defer metricsMu.RUnlock()
	return metricsCache
}

// ─── Internal snapshot types ──────────────────────────────────────────────────

type netSnapshot struct {
	time       time.Time
	interfaces map[string][2]uint64 // name -> [rx, tx]
}

// ─── Collection logic ─────────────────────────────────────────────────────────

func collectOnce(prev *netSnapshot) (*models.SystemMetrics, *netSnapshot) {
	m := &models.SystemMetrics{
		Timestamp: time.Now().UnixMilli(),
	}

	// Hostname
	if h, err := os.Hostname(); err == nil {
		m.Hostname = h
	}

	// Uptime
	if info, err := host.Info(); err == nil {
		m.Uptime = info.Uptime
	}

	// CPU — single caller, safe to use interval=0 (delta since last call).
	// Returns per-core values; we derive total as average.
	if pcts, err := cpu.Percent(0, true); err == nil && len(pcts) > 0 {
		m.CPU.PerCore = pcts
		var sum float64
		for _, p := range pcts {
			sum += p
		}
		m.CPU.Percent = sum / float64(len(pcts))
	}
	if counts, err := cpu.Counts(true); err == nil {
		m.CPU.Cores = counts
	}

	// Memory
	if v, err := mem.VirtualMemory(); err == nil {
		m.Memory = models.MemoryInfo{
			Total:       v.Total,
			Used:        v.Used,
			Free:        v.Free,
			Available:   v.Available,
			UsedPercent: v.UsedPercent,
		}
	}

	// Swap
	if s, err := mem.SwapMemory(); err == nil {
		m.Swap = models.SwapInfo{
			Total:       s.Total,
			Used:        s.Used,
			UsedPercent: s.UsedPercent,
		}
	}

	// Disks
	if parts, err := disk.Partitions(false); err == nil {
		for _, p := range parts {
			if u, err := disk.Usage(p.Mountpoint); err == nil {
				m.Disks = append(m.Disks, models.DiskInfo{
					Path:        p.Mountpoint,
					Total:       u.Total,
					Used:        u.Used,
					Free:        u.Free,
					UsedPercent: u.UsedPercent,
					Fstype:      p.Fstype,
				})
			}
		}
	}

	// Network rates
	now := time.Now()
	snap := &netSnapshot{time: now, interfaces: make(map[string][2]uint64)}

	if ifaces, err := psnet.IOCounters(true); err == nil {
		var totalRxRate, totalTxRate float64

		for _, iface := range ifaces {
			snap.interfaces[iface.Name] = [2]uint64{iface.BytesRecv, iface.BytesSent}

			ni := models.NetInterface{
				Name: iface.Name,
				Rx:   iface.BytesRecv,
				Tx:   iface.BytesSent,
			}

			if prev != nil {
				dt := now.Sub(prev.time).Seconds()
				if dt > 0 {
					if p, ok := prev.interfaces[iface.Name]; ok {
						if iface.BytesRecv >= p[0] {
							ni.RxRate = float64(iface.BytesRecv-p[0]) / dt
						}
						if iface.BytesSent >= p[1] {
							ni.TxRate = float64(iface.BytesSent-p[1]) / dt
						}
					}
				}
			}

			totalRxRate += ni.RxRate
			totalTxRate += ni.TxRate
			m.Network.Interfaces = append(m.Network.Interfaces, ni)
		}

		m.Network.RxRate = totalRxRate
		m.Network.TxRate = totalTxRate
	}

	// Load average
	if l, err := load.Avg(); err == nil {
		m.Load = models.LoadInfo{
			Load1:  l.Load1,
			Load5:  l.Load5,
			Load15: l.Load15,
		}
	}

	return m, snap
}
