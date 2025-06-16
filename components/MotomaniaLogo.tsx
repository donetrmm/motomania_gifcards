'use client'

import { motion } from 'framer-motion'

interface MotomaniaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  animated?: boolean
}

const sizes = {
  sm: 'w-20 h-10',
  md: 'w-32 h-16',
  lg: 'w-40 h-20',
  xl: 'w-56 h-28'
}

export default function MotomaniaLogo({ 
  size = 'md', 
  className = '', 
  animated = true 
}: MotomaniaLogoProps) {
  const logoContent = (
    <img 
      src="/motomania-sinbg.png"
      alt="Motomania Logo"
      className={`${sizes[size]} ${className} object-contain`}
    />
  )

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        whileHover={{ scale: 1.05 }}
      >
        {logoContent}
      </motion.div>
    )
  }

  return logoContent
} 