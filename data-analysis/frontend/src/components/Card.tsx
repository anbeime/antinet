import React from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react'

/**
 * 四色卡片组件
 */
interface CardProps {
  title: string
  content: string
  color: 'blue' | 'green' | 'yellow' | 'red'
  category?: string
  tags?: string[]
  onClick?: () => void
}

const colorStyles = {
  blue: {
    bg: 'bg-card-blue-bg',
    border: 'border-card-blue-border',
    text: 'text-card-blue-text',
    icon: Info,
  },
  green: {
    bg: 'bg-card-green-bg',
    border: 'border-card-green-border',
    text: 'text-card-green-text',
    icon: CheckCircle,
  },
  yellow: {
    bg: 'bg-card-yellow-bg',
    border: 'border-card-yellow-border',
    text: 'text-card-yellow-text',
    icon: AlertCircle,
  },
  red: {
    bg: 'bg-card-red-bg',
    border: 'border-card-red-border',
    text: 'text-card-red-text',
    icon: XCircle,
  },
}

const Card: React.FC<CardProps> = ({
  title,
  content,
  color,
  category,
  tags,
  onClick,
}) => {
  const style = colorStyles[color]
  const Icon = style.icon

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`${style.bg} ${style.border} ${style.text} border-2 rounded-lg p-4 shadow-md cursor-pointer transition-all`}
    >
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          {category && (
            <span className="text-xs font-semibold uppercase tracking-wider opacity-70">
              {category}
            </span>
          )}
          <h3 className="font-semibold mt-1">{title}</h3>
          <p className="text-sm mt-2 opacity-90 line-clamp-3">{content}</p>
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="text-xs px-2 py-0.5 rounded-full bg-opacity-30 bg-black"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default Card
