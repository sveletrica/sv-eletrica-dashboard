'use client'

import { useState, useEffect } from 'react'

function getNextCronTime(from: Date = new Date()): Date {
    const next = new Date(from)
    const hours = next.getHours()
    const minutes = next.getMinutes()

    // If outside operating hours (23:00-05:00), set to next 05:03
    if (hours >= 23 || hours < 5) {
        next.setHours(5, 3, 0, 0)
        if (hours >= 23) {
            next.setDate(next.getDate() + 1)
        }
        return next
    }

    // Calculate next update time (either :03 or :33)
    if (minutes < 3) {
        next.setMinutes(3, 0, 0)
    } else if (minutes < 33) {
        next.setMinutes(33, 0, 0)
    } else {
        // Move to next hour
        next.setHours(hours + 1, 3, 0, 0)
        
        // If we moved past 23:00, set to next day 05:03
        if (next.getHours() >= 23) {
            next.setDate(next.getDate() + 1)
            next.setHours(5, 3, 0, 0)
        }
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