'use client'

import { useState, useEffect } from 'react'

function getNextCronTime(from: Date = new Date()): Date {
    const next = new Date(from)
    const hours = next.getHours()
    const minutes = next.getMinutes()

    // If outside operating hours (22:00-06:00), set to next 06:00
    if (hours >= 22 || hours < 6) {
        next.setHours(6, 0, 0, 0)
        if (hours >= 22) {
            next.setDate(next.getDate() + 1)
        }
        return next
    }

    // Calculate next 35-minute interval
    const currentInterval = Math.floor(minutes / 35)
    const nextIntervalMinutes = (currentInterval + 1) * 35

    if (nextIntervalMinutes >= 60) {
        // Move to next hour
        next.setHours(hours + 1, nextIntervalMinutes - 60, 0, 0)
        
        // If we moved past 22:00, set to next day 06:00
        if (next.getHours() >= 22) {
            next.setDate(next.getDate() + 1)
            next.setHours(6, 0, 0, 0)
        }
    } else {
        next.setMinutes(nextIntervalMinutes, 0, 0)
    }

    return next
}

function formatTimeLeft(difference: number): string {
    if (difference <= 0) return 'Atualização pendente'

    const hours = Math.floor(difference / (1000 * 60 * 60))
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((difference % (1000 * 60)) / 1000)

    let timeString = ''
    if (hours > 0) {
        timeString += `${hours}h `
    }
    if (minutes > 0 || hours > 0) {
        timeString += `${minutes}min `
    }
    timeString += `${seconds}s`

    return timeString.trim()
}

export function CountdownTimer() {
    const [timeLeft, setTimeLeft] = useState(() => {
        const nextUpdate = getNextCronTime()
        const difference = nextUpdate.getTime() - new Date().getTime()
        return formatTimeLeft(difference)
    })

    useEffect(() => {
        const calculateTimeLeft = () => {
            const nextUpdate = getNextCronTime()
            const difference = nextUpdate.getTime() - new Date().getTime()
            setTimeLeft(formatTimeLeft(difference))
        }

        const timer = setInterval(calculateTimeLeft, 1000)
        return () => clearInterval(timer)
    }, [])

    return <span>{timeLeft}</span>
} 