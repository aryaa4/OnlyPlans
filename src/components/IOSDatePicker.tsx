'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface IOSDatePickerProps {
  value: string // 'YYYY-MM-DD'
  onChange: (val: string) => void
  onClose: () => void
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function WheelColumn({ items, selectedValue, onSelect, format }: { items: number[], selectedValue: number, onSelect: (val: number) => void, format?: (val: number) => string | number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  
  // Update observer
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          const val = entry.target.getAttribute('data-value')
          if (val) {
             const parsed = Number(val)
             if (!isNaN(parsed) && parsed !== selectedValue) {
               onSelect(parsed)
             }
          }
        }
      })
    }, {
      root: container,
      threshold: 0.6
    })

    itemRefs.current.forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
  }, [items, onSelect, selectedValue])

  // Initial scroll to selected item
  useEffect(() => {
    const idx = items.findIndex((i: number) => i === selectedValue)
    if (idx >= 0 && containerRef.current && itemRefs.current[idx]) {
      // 80 is (containerHeight / 2) - (itemHeight / 2) = 100 - 20
      containerRef.current.scrollTop = itemRefs.current[idx]!.offsetTop - 80
    }
  }, [items, selectedValue])

  return (
    <div 
      ref={containerRef}
      className="ios-wheel"
      style={{
        flex: 1,
        height: 200,
        overflowY: 'scroll',
        scrollSnapType: 'y mandatory',
        scrollbarWidth: 'none', // Firefox
        position: 'relative',
        paddingTop: 80,
        paddingBottom: 80,
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <style>{`.ios-wheel::-webkit-scrollbar { display: none; }`}</style>
      {items.map((item: number, idx: number) => {
        const isSelected = item === selectedValue
        return (
          <div
            key={item}
            ref={el => { itemRefs.current[idx] = el }}
            data-value={item}
            style={{
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              scrollSnapAlign: 'center',
              fontSize: 20,
              fontWeight: isSelected ? 800 : 500,
              color: isSelected ? '#E85A4F' : 'var(--text-muted)',
              opacity: isSelected ? 1 : 0.4,
              transition: 'opacity 0.15s, color 0.15s',
              cursor: 'pointer'
            }}
            onClick={() => {
               if (containerRef.current && itemRefs.current[idx]) {
                 containerRef.current.scrollTo({ top: itemRefs.current[idx]!.offsetTop - 80, behavior: 'smooth' })
               }
            }}
          >
            {format ? format(item) : item}
          </div>
        )
      })}
    </div>
  )
}

export default function IOSDatePicker({ value, onChange, onClose }: IOSDatePickerProps) {
  const currentYear = new Date().getFullYear()
  const maxYear = currentYear - 18
  const minYear = maxYear - 80

  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i)
  
  // State
  const [selectedYear, setSelectedYear] = useState(() => {
    if (value) return parseInt(value.split('-')[0])
    return maxYear
  })
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (value) return parseInt(value.split('-')[1]) - 1
    return 0 // Jan
  })
  const [selectedDay, setSelectedDay] = useState(() => {
    if (value) return parseInt(value.split('-')[2])
    return 1
  })

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const handleDone = () => {
    const finalDay = selectedDay > daysInMonth ? daysInMonth : selectedDay
    const yyyy = selectedYear
    const mm = String(selectedMonth + 1).padStart(2, '0')
    const dd = String(finalDay).padStart(2, '0')
    onChange(`${yyyy}-${mm}-${dd}`)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(62,54,46,0.35)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 430, margin: '0 auto', background: '#FFF7F2', borderRadius: '28px 28px 0 0', paddingBottom: 'env(safe-area-inset-bottom, 20px)', boxShadow: '0 -10px 40px rgba(0,0,0,0.1)' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleDone} style={{ background: 'none', border: 'none', color: '#E85A4F', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>Done</button>
        </div>

        {/* Wheels Container */}
        <div style={{ position: 'relative', display: 'flex', height: 200, padding: '0 20px', overflow: 'hidden' }}>
          
          {/* Highlight selection bar */}
          <div style={{ position: 'absolute', top: 80, left: 20, right: 20, height: 40, background: 'rgba(232,90,79,0.08)', borderRadius: 12, pointerEvents: 'none' }} />
          
          <WheelColumn items={days} selectedValue={selectedDay} onSelect={setSelectedDay} format={(d: number) => String(d).padStart(2, '0')} />
          <WheelColumn items={MONTHS.map((_, i) => i)} selectedValue={selectedMonth} onSelect={setSelectedMonth} format={(m: number) => MONTHS[m]} />
          <WheelColumn items={years} selectedValue={selectedYear} onSelect={setSelectedYear} />
          
          {/* Soft gradients for top/bottom fade */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to bottom, #FFF7F2, transparent)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to top, #FFF7F2, transparent)', pointerEvents: 'none' }} />
        </div>
      </motion.div>
    </motion.div>
  )
}
