package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetAWGData returns the cached AmneziaWG data as JSON.
func GetAWGData(c *gin.Context) {
	data := getAWGCached()
	if data == nil {
		c.JSON(http.StatusOK, gin.H{"available": false})
		return
	}
	c.JSON(http.StatusOK, data)
}
