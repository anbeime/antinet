import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from './Card';
import type { HappyFuelStationProps, CountdownInfo } from '@/types/calendar';

export default function HappyFuelStation({ daysToHoliday }: HappyFuelStationProps) {
  const getCountdownInfo = (): CountdownInfo => {
    if (daysToHoliday.includes('今天')) {
      return { title: '节日快乐！', days: 0, message: '尽情享受美好时光吧！' };
    }
    if (daysToHoliday.includes('明天')) {
      return { title: '明天就是假期！', days: 1, message: '坚持一下，快乐就在眼前！' };
    }
    const match = daysToHoliday.match(/还有(\d+)天/);
    if (match) {
      const days = parseInt(match[1]);
      return {
        title: '加油！',
        days,
        message: days <= 3 ? '胜利在望！' : '每一天都是新的开始！'
      };
    }
    return { title: '快乐加油站', days: 0, message: '保持好心情！' };
  };

  const countdownInfo = getCountdownInfo();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="w-full"
    >
      <Card
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(212, 165, 116, 0.1), rgba(139, 115, 85, 0.1))',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(212, 165, 116, 0.2)'
        }}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="flex-shrink-0"
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(212, 165, 116, 0.1), rgba(139, 115, 85, 0.1))' }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(212, 165, 116, 0.2), rgba(139, 115, 85, 0.2))' }}>
                  <span className="text-2xl">⛽</span>
                </div>
              </div>
            </motion.div>

            <div className="flex-1 space-y-2">
              <div className="space-y-1">
                <h3 className="text-lg font-medium leading-snug" style={{ color: '#d4a574' }}>快乐加油站</h3>
                <div className="w-12 h-0.5 rounded-full" style={{ backgroundColor: 'rgba(212, 165, 116, 0.5)' }}></div>
              </div>

              {countdownInfo.days > 0 && (
                <motion.div
                  className="text-4xl font-medium leading-none"
                  style={{ color: '#d4a574' }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
                >
                  {countdownInfo.days}
                </motion.div>
              )}

              <div className="space-y-1">
                <div className="text-base font-medium leading-normal" style={{ color: '#60a5fa' }}>{countdownInfo.title}</div>
                <div className="text-sm font-normal leading-relaxed" style={{ color: '#8b7355' }}>{countdownInfo.message}</div>
              </div>

              {countdownInfo.days > 0 && (
                <div className="relative pt-1">
                  <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(212, 165, 116, 0.2)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: '#d4a574' }}
                      initial={{ width: '0%' }}
                      animate={{ width: `${Math.max(10, 100 - countdownInfo.days * 10)}%` }}
                      transition={{ duration: 1, delay: 0.6 }}
                    />
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#8b7355' }}>距离假期越来越近</div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
