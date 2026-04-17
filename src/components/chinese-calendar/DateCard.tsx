import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from './Card';
import type { DateCardProps } from '@/types/calendar';

class Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  season: string;

  constructor(canvas: HTMLCanvasElement, season: string) {
    this.season = season;
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;

    if (season === '冬日') {
      this.size = Math.random() * 5 + 3;
      this.speedX = Math.random() * 1.0 - 0.5;
      this.speedY = Math.random() * 1.0 + 0.5;
      this.opacity = Math.random() * 0.8 + 0.6;
    } else if (season === '春日') {
      this.size = Math.random() * 3 + 2;
      this.speedX = Math.random() * 0.8 - 0.4;
      this.speedY = Math.random() * 0.7 + 0.3;
      this.opacity = Math.random() * 0.6 + 0.4;
    } else if (season === '夏日') {
      this.size = Math.random() * 4 + 2;
      this.speedX = Math.random() * 0.6 - 0.3;
      this.speedY = Math.random() * -0.8 - 0.4;
      this.opacity = Math.random() * 0.7 + 0.4;
    } else {
      this.size = Math.random() * 4 + 2.5;
      this.speedX = Math.random() * 0.9 - 0.45;
      this.speedY = Math.random() * 0.8 + 0.3;
      this.opacity = Math.random() * 0.7 + 0.4;
    }
  }

  update(canvas: HTMLCanvasElement) {
    this.x += this.speedX;
    this.y += this.speedY;

    if (this.x > canvas.width) this.x = 0;
    if (this.x < 0) this.x = canvas.width;

    if (this.season === '夏日') {
      if (this.y < 0) this.y = canvas.height;
    } else {
      if (this.y > canvas.height) this.y = 0;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.opacity;

    if (this.season === '冬日') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * 60 * Math.PI) / 180;
        const x1 = this.x + Math.cos(angle) * this.size;
        const y1 = this.y + Math.sin(angle) * this.size;
        const x2 = this.x + Math.cos(angle + Math.PI / 6) * this.size * 0.5;
        const y2 = this.y + Math.sin(angle + Math.PI / 6) * this.size * 0.5;

        if (i === 0) {
          ctx.moveTo(x1, y1);
        } else {
          ctx.lineTo(x1, y1);
        }
        ctx.lineTo(x2, y2);
      }
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#f0f8ff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.season === '春日') {
      ctx.fillStyle = '#ffb6c1';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.size, this.size * 0.6, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff69b4';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.season === '夏日') {
      ctx.fillStyle = '#87ceeb';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.x - this.size * 0.3, this.y - this.size * 0.3, this.size * 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#ffa500';
      ctx.beginPath();
      const angle = Math.PI / 4;
      for (let i = 0; i < 5; i++) {
        const x = this.x + Math.cos(angle + i * Math.PI * 0.4) * this.size;
        const y = this.y + Math.sin(angle + i * Math.PI * 0.4) * this.size;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

export default function DateCard({ solarDate, lunarDate, weekday, month, holidayStatus, daysToHoliday, season }: DateCardProps) {
  const [countedDate, setCountedDate] = useState(parseInt(solarDate));
  const [isHovered, setIsHovered] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const targetDate = parseInt(solarDate);
    if (countedDate !== targetDate) {
      setCountedDate(targetDate);
    }
  }, [solarDate, countedDate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    if (isHovered && particlesRef.current.length === 0) {
      const particleCount = season === '冬日' ? 50 : 45;
      particlesRef.current = Array.from({ length: particleCount }, () => new Particle(canvas, season));
    }

    const animate = () => {
      if (!isHovered) {
        particlesRef.current = [];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      const targetCount = season === '冬日' ? 50 : 45;
      if (particlesRef.current.length < targetCount) {
        particlesRef.current.push(new Particle(canvas, season));
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach(particle => {
        particle.update(canvas);
        particle.draw(ctx);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isHovered, season]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full rounded-lg pointer-events-none opacity-0 transition-opacity duration-200 z-20"
        style={{ opacity: isHovered ? 1 : 0 }}
      />

      <Card
        className={`p-6 rounded-lg shadow-sm transition-all duration-200 relative z-10 ${
          isHovered ? 'shadow-lg scale-[1.02] cursor-pointer' : ''
        }`}
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(12px)'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="text-center">
              <motion.div
                className="text-8xl md:text-9xl font-medium leading-none"
                style={{ color: '#d4a574' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                {countedDate.toString().padStart(2, '0')}
              </motion.div>
            </div>

            <motion.div
              className="text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              <div className="text-base font-medium leading-snug" style={{ color: '#8b7355' }}>
                {month}
              </div>
            </motion.div>

            <motion.div
              className="text-center"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.3, ease: "easeOut" }}
            >
              <div className="text-lg font-medium leading-normal" style={{ color: '#60a5fa' }}>
                {lunarDate}
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex justify-center items-center gap-4">
                  <div className="text-lg font-medium leading-normal" style={{ color: '#8b7355' }}>
                    {weekday}
                  </div>
                  <div className="text-lg font-medium leading-normal" style={{ color: '#8b7355' }}>
                    {holidayStatus}
                  </div>
                </div>
                <div className="text-sm font-normal leading-normal" style={{ color: '#d4a574' }}>
                  {daysToHoliday}
                </div>
              </div>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

