package middleware

import (
	"sync"
	"time"
)

type TokenBlacklist struct {
	mu      sync.RWMutex
	tokens  map[string]time.Time
	enabled bool
}

func NewTokenBlacklist(enabled bool) *TokenBlacklist {
	bl := &TokenBlacklist{
		tokens:  make(map[string]time.Time),
		enabled: enabled,
	}
	if enabled {
		go bl.cleanup()
	}
	return bl
}

func (bl *TokenBlacklist) cleanup() {
	for {
		time.Sleep(5 * time.Minute)
		bl.mu.Lock()
		now := time.Now()
		for token, expiry := range bl.tokens {
			if now.After(expiry) {
				delete(bl.tokens, token)
			}
		}
		bl.mu.Unlock()
	}
}

func (bl *TokenBlacklist) Add(token string, ttl time.Duration) {
	if !bl.enabled {
		return
	}
	bl.mu.Lock()
	defer bl.mu.Unlock()
	bl.tokens[token] = time.Now().Add(ttl)
}

func (bl *TokenBlacklist) IsBlacklisted(token string) bool {
	if !bl.enabled {
		return false
	}
	bl.mu.RLock()
	defer bl.mu.RUnlock()
	expiry, exists := bl.tokens[token]
	if !exists {
		return false
	}
	return time.Now().Before(expiry)
}
