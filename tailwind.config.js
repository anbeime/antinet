/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      /* ========== 仿古暖棕宣纸风格配色 ========== */
      colors: {
        /* 页面底色 */
        'paper': {
          DEFAULT: '#FCF8EF',
          soft: '#F5EBDC',
          mute: '#EDE0CC',
        },
        /* 文字颜色 */
        'ink': {
          main: '#694E33',      /* 深棕墨褐 - 标题 */
          desc: '#7A634A',      /* 浅棕灰 - 正文 */
          muted: '#967D5E',     /* 辅助文字 */
        },
        /* 表头/导航 */
        'wood': {
          DEFAULT: '#D4B896',   /* 浅原木棕 */
          soft: '#C4A882',
          dark: '#B8956A',
        },
        /* 边框 */
        'border': {
          DEFAULT: '#E2D8C8',
          soft: 'rgba(226, 216, 200, 0.5)',
        },
        /* 任务三色体系 */
        'task': {
          red: '#D83838',       /* 朱砂印章红 */
          yellow: '#E6B23C',    /* 古籍明黄 */
          blue: '#3269BC',      /* 低饱和青蓝 */
        },
        /* 知识卡片四辅色（低饱和） */
        'card': {
          blue: '#A8B9C9',      /* 淡石青 - 核心概念 */
          green: '#B8C9A8',     /* 浅竹绿 - 关联链接 */
          yellow: '#E9D2A6',    /* 古籍米黄 - 参考来源 */
          red: '#E9B9B9',       /* 朱砂浅红 - 索引关键词 */
        },
        /* 暗色模式 */
        'dark': {
          bg: '#2A1F14',
          soft: '#3A2D1E',
          mute: '#4A3A28',
          text: '#F5EBDC',
          border: 'rgba(212, 184, 150, 0.25)',
        },
      },
      /* 字体族 */
      fontFamily: {
        title: ['STXingkai', '华文行楷', 'STSong', '仿宋', 'SimSun', '宋体', 'serif'],
        body: ['Source Han Sans CN', '思源黑体', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        mono: ['Fira Code', 'Cascadia Code', 'Consolas', 'monospace'],
      },
      /* 圆角 */
      borderRadius: {
        'card': '8px',
      },
    },
  },
  plugins: [],
};
