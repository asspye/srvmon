package collectors

import (
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"srvmon/models"
)

// CollectAWG runs "awg show all dump" inside the Amnezia Docker container.
func CollectAWG() *models.AWGData {
	container := os.Getenv("AWG_CONTAINER_NAME")
	if container == "" {
		container = "amnezia-awg"
	}

	out, err := runDockerExec(container, "awg", "show", "all", "dump")
	if err != nil {
		out, err = runDockerExec(container, "wg", "show", "all", "dump")
		if err != nil {
			return &models.AWGData{Available: false, Error: err.Error(), Interfaces: []models.AWGIface{}}
		}
	}

	return parseWGDump(out)
}

func runDockerExec(container string, args ...string) (string, error) {
	cmdArgs := append([]string{"exec", container}, args...)
	out, err := exec.Command("docker", cmdArgs...).Output()
	return string(out), err
}

// parseWGDump parses "awg/wg show all dump" output.
//
// AmneziaWG interface lines have 20+ fields (extra obfuscation params),
// standard WireGuard has 5. We distinguish by checking if fields[3] is a
// pure number (listen port = interface line) vs an endpoint/IP (peer line).
//
// Interface line: <iface> <privkey> <pubkey> <port> [extra amnezia fields...]
// Peer line:      <iface> <pubkey>  <psk>    <endpoint> <allowed_ips> <handshake> <rx> <tx> <keepalive>
func parseWGDump(raw string) *models.AWGData {
	data := &models.AWGData{Available: true, Interfaces: []models.AWGIface{}}

	for _, line := range strings.Split(strings.TrimSpace(raw), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 5 {
			continue
		}

		if isNumeric(fields[3]) {
			// Interface line — fields[3] is the numeric listen port
			data.Interfaces = append(data.Interfaces, models.AWGIface{
				Name:       fields[0],
				PublicKey:  fields[2],
				ListenPort: fields[3],
			})
		} else if len(fields) >= 9 {
			// Peer line — fields[3] is endpoint (ip:port or "(none)")
			ifaceName := fields[0]
			handshake, _ := strconv.ParseInt(fields[5], 10, 64)
			rx, _ := strconv.ParseInt(fields[6], 10, 64)
			tx, _ := strconv.ParseInt(fields[7], 10, 64)

			connected := handshake > 0 && time.Now().Unix()-handshake < 180

			peer := models.AWGPeer{
				PublicKey:     fields[1],
				Endpoint:      fields[3],
				AllowedIPs:    fields[4],
				LastHandshake: handshake,
				TransferRx:    rx,
				TransferTx:    tx,
				Connected:     connected,
			}

			for i := range data.Interfaces {
				if data.Interfaces[i].Name == ifaceName {
					data.Interfaces[i].Peers = append(data.Interfaces[i].Peers, peer)
					break
				}
			}

			data.TotalPeers++
			if connected {
				data.ActivePeers++
			}
		}
	}

	return data
}

func isNumeric(s string) bool {
	_, err := strconv.Atoi(s)
	return err == nil
}
