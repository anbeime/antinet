import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Network, ZoomIn, ZoomOut, RotateCw } from 'lucide-react'

/**
 * 知识图谱可视化组件
 */
interface KnowledgeGraphProps {
  data: {
    nodes: Array<{
      id: string
      label: string
      color: string
      category: string
    }>
    links: Array<{
      source: string
      target: string
      type: string
    }>
  }
  onNodeClick?: (nodeId: string) => void
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ data, onNodeClick }) => {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 2))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.5))
  const handleRotate = () => setRotation((prev) => prev + 90)

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId)
    onNodeClick?.(nodeId)
  }

  // 计算节点位置（简单布局）
  const nodePositions = React.useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {}
    const centerX = 300
    const centerY = 300
    const radius = 200

    data.nodes.forEach((node, index) => {
      const angle = (index / data.nodes.length) * 2 * Math.PI
      positions[node.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      }
    })

    return positions
  }, [data.nodes])

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-lg shadow-md p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-gray-800">知识图谱</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="放大"
          >
            <ZoomIn className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="缩小"
          >
            <ZoomOut className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={handleRotate}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="旋转"
          >
            <RotateCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="relative w-full h-[600px] overflow-hidden bg-gray-50 rounded-lg">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 600 600"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
          }}
        >
          {/* 绘制连线 */}
          {data.links.map((link, index) => {
            const sourcePos = nodePositions[link.source]
            const targetPos = nodePositions[link.target]
            if (!sourcePos || !targetPos) return null

            return (
              <line
                key={index}
                x1={sourcePos.x}
                y1={sourcePos.y}
                x2={targetPos.x}
                y2={targetPos.y}
                stroke="#9ca3af"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
            )
          })}

          {/* 定义箭头 */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="10"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
            </marker>
          </defs>

          {/* 绘制节点 */}
          {data.nodes.map((node) => {
            const pos = nodePositions[node.id]
            if (!pos) return null

            return (
              <g
                key={node.id}
                onClick={() => handleNodeClick(node.id)}
                className="cursor-pointer"
              >
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="40"
                  className={colorClasses[node.color] || 'bg-gray-500'}
                  opacity={selectedNode && selectedNode !== node.id ? '0.5' : '1'}
                  stroke={selectedNode === node.id ? '#000' : 'none'}
                  strokeWidth={selectedNode === node.id ? '3' : '0'}
                />
                <text
                  x={pos.x}
                  y={pos.y + 5}
                  textAnchor="middle"
                  className="fill-white text-xs font-semibold"
                  pointerEvents="none"
                >
                  {node.label}
                </text>
              </g>
            )
          })}
        </svg>

        {/* 图例 */}
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-md">
          <div className="text-xs font-semibold text-gray-700 mb-2">颜色图例</div>
          <div className="space-y-1">
            {Object.entries(colorClasses).map(([color, className]) => (
              <div key={color} className="flex items-center gap-2 text-xs">
                <div className={`w-3 h-3 rounded-full ${className}`} />
                <span className="text-gray-600 capitalize">{color}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 节点详情 */}
        {selectedNode && (
          <div className="absolute top-4 right-4 bg-white bg-opacity-95 rounded-lg p-4 shadow-md max-w-xs">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-800">节点详情</h4>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            {(() => {
              const node = data.nodes.find((n) => n.id === selectedNode)
              return node ? (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">标签：</span>
                    <span className="text-gray-800">{node.label}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">分类：</span>
                    <span className="text-gray-800">{node.category}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">颜色：</span>
                    <span className="capitalize text-gray-800">{node.color}</span>
                  </div>
                </div>
              ) : null
            })()}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default KnowledgeGraph
