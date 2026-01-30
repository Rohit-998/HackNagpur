'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'

const RealtimeContext = createContext(null)

export function RealtimeProvider({ children }) {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    const socketInstance = io(API_URL, {
      transports: ['websocket', 'polling'],
    })

    socketInstance.on('connect', () => {
      console.log('✓ Connected to backend')
      setConnected(true)
      socketInstance.emit('client:join', { timestamp: new Date().toISOString() })
    })

    socketInstance.on('disconnect', () => {
      console.log('✗ Disconnected from backend')
      setConnected(false)
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.close()
    }
  }, [])

  return (
    <RealtimeContext.Provider value={{ socket, connected }}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider')
  }
  return context
}
