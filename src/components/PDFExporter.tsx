import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, pdf, Font } from '@react-pdf/renderer';

// 注册中文字体（使用 ?url 让 Vite 返回正确的 URL）
// @react-pdf/renderer 在 Web Worker 中运行，必须用可 fetch 的 URL
const FONT_URL = new URL('/fonts/NotoSansSC-Regular.ttf', import.meta.url).href;

Font.register({
  family: 'Noto Sans SC',
  fonts: [
    { src: FONT_URL, fontWeight: 'normal' },
    { src: FONT_URL, fontWeight: 'bold' },
  ],
});

// 定义卡片类型
interface KnowledgeCard {
  id: string;
  color: 'blue' | 'green' | 'yellow' | 'red';
  title: string;
  content: string;
  address: string;
  createdAt: string;
}

// 定义样式
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2pt solid #3b82f6',
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
    fontFamily: 'Noto Sans SC',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'Noto Sans SC',
  },
  cardContainer: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Noto Sans SC',
  },
  cardBadge: {
    padding: '4 8',
    borderRadius: 4,
    fontSize: 10,
    fontFamily: 'Noto Sans SC',
  },
  cardContent: {
    fontSize: 12,
    lineHeight: 1.6,
    color: '#374151',
    fontFamily: 'Noto Sans SC',
  },
  cardFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: '1pt solid #e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardMeta: {
    fontSize: 9,
    color: '#9ca3af',
    fontFamily: 'Noto Sans SC',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 10,
    color: '#9ca3af',
    fontFamily: 'Noto Sans SC',
  },
});

// 卡片颜色配置
const cardColors = {
  blue: {
    border: '#3b82f6',
    background: '#eff6ff',
    badge: '#1e40af',
    name: '核心概念',
  },
  green: {
    border: '#10b981',
    background: '#ecfdf5',
    badge: '#047857',
    name: '关联链接',
  },
  yellow: {
    border: '#f59e0b',
    background: '#fffbeb',
    badge: '#d97706',
    name: '参考来源',
  },
  red: {
    border: '#ef4444',
    background: '#fef2f2',
    badge: '#dc2626',
    name: '索引关键词',
  },
};

interface PDFDocumentProps {
  cards: KnowledgeCard[];
  title?: string;
  author?: string;
}

// PDF 文档组件
const PDFDocument: React.FC<PDFDocumentProps> = ({ cards, title = 'Antinet 知识卡片导出', author = 'Antinet 智能知识管家' }) => {
  const currentDate = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 页眉 */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            生成日期: {currentDate} | 作者: {author} | 卡片数量: {cards.length}
          </Text>
        </View>

        {/* 卡片列表 */}
        {cards.map((card, index) => {
          const colorConfig = cardColors[card.color];
          return (
            <View
              key={card.id}
              style={[
                styles.cardContainer,
                {
                  borderColor: colorConfig.border,
                  backgroundColor: colorConfig.background,
                },
              ]}
            >
              {/* 卡片头部 */}
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colorConfig.badge }]}>
                  {index + 1}. {card.title}
                </Text>
                <View
                  style={[
                    styles.cardBadge,
                    { backgroundColor: colorConfig.badge },
                  ]}
                >
                  <Text style={{ color: '#ffffff' }}>{colorConfig.name}</Text>
                </View>
              </View>

              {/* 卡片内容 */}
              <Text style={styles.cardContent}>{card.content}</Text>

              {/* 卡片底部 */}
              <View style={styles.cardFooter}>
                <Text style={styles.cardMeta}>地址: {card.address}</Text>
                <Text style={styles.cardMeta}>
                  创建时间: {new Date(card.createdAt).toLocaleString('zh-CN')}
                </Text>
              </View>
            </View>
          );
        })}

        {/* 页脚 */}
        <Text style={styles.footer}>
          由 Antinet 智能知识管家生成 | 基于骁龙 AIPC 平台 | 数据不出域
        </Text>
      </Page>
    </Document>
  );
};

interface PDFExporterProps {
  cards: KnowledgeCard[];
  title?: string;
  author?: string;
  fileName?: string;
  children?: React.ReactNode;
  showPreview?: boolean;
}

// PDF 导出器组件
const PDFExporter: React.FC<PDFExporterProps> = ({
  cards,
  title,
  author,
  fileName = 'antinet-cards.pdf',
  children,
  showPreview = true,
}) => {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const urlRef = useRef<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const handlePreview = async () => {
    if (cards.length === 0 || isPreviewing) return;
    setIsPreviewing(true);
    try {
      const blob = await pdf(<PDFDocument cards={cards} title={title} author={author} />).toBlob();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      window.open('/pdf-viewer?url=' + encodeURIComponent(url), '_blank');
      // 给新标签页足够时间加载（PDF 查看器会自行 fetch 该 URL 并转 ArrayBuffer）
      setTimeout(() => {
        if (previewUrlRef.current === url) {
          URL.revokeObjectURL(url);
          previewUrlRef.current = null;
        }
      }, 60000);
    } catch (err) {
      console.error('[PDFExporter] 预览失败:', err);
    } finally {
      setIsPreviewing(false);
    }
  };

  if (cards.length === 0) {
    return (
      <button
        disabled
        className="bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed"
      >
        {children || '导出 PDF'}
      </button>
    );
  }

  return (
    <div className="flex gap-2">
      <PDFDownloadLink
        document={<PDFDocument cards={cards} title={title} author={author} />}
        fileName={fileName}
      >
        {({ loading, error, url }) => {
          if (loading || isGenerating) {
            return (
              <button
                disabled
                className="bg-blue-400 text-white px-4 py-2 rounded-lg cursor-wait"
              >
                {isGenerating ? '准备中...' : '生成中...'}
              </button>
            );
          }

          if (error) {
            return (
              <button
                disabled
                className="bg-red-500 text-white px-4 py-2 rounded-lg cursor-not-allowed"
              >
                生成失败
              </button>
            );
          }

          if (url && url !== urlRef.current) {
            urlRef.current = url;
            setIsGenerating(true);
            fetch(url).then(r => r.blob()).then(b => {
              setPdfBlob(b);
              setIsGenerating(false);
            }).catch(() => setIsGenerating(false));
          }

          return (
            <div className="flex items-center gap-2">
              <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all">
                {children || '导出 PDF'}
              </button>
              {pdfBlob && (
                <span className="text-xs text-green-600 dark:text-green-400">
                  ✓ {Math.round(pdfBlob.size / 1024)}KB
                </span>
              )}
            </div>
          );
        }}
      </PDFDownloadLink>

      {showPreview && (
        <button
          onClick={handlePreview}
          disabled={isPreviewing}
          className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all disabled:opacity-60 disabled:cursor-wait"
          title="在 PDF 查看器中预览（可编辑·保存为笔记）"
        >
          {isPreviewing ? '生成预览…' : '预览'}
        </button>
      )}
    </div>
  );
};

export default PDFExporter;
