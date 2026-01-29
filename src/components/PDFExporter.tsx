import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer';

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
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
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
  },
  cardBadge: {
    padding: '4 8',
    borderRadius: 4,
    fontSize: 10,
  },
  cardContent: {
    fontSize: 12,
    lineHeight: 1.6,
    color: '#374151',
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
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 10,
    color: '#9ca3af',
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
}

// PDF 导出器组件
const PDFExporter: React.FC<PDFExporterProps> = ({
  cards,
  title,
  author,
  fileName = 'antinet-cards.pdf',
  children,
}) => {
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
    <PDFDownloadLink
      document={<PDFDocument cards={cards} title={title} author={author} />}
      fileName={fileName}
    >
      {({ blob, url, loading, error }) => {
        if (loading) {
          return (
            <button
              disabled
              className="bg-blue-400 text-white px-4 py-2 rounded-lg cursor-wait"
            >
              生成中...
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

        return (
          <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all">
            {children || '导出 PDF'}
          </button>
        );
      }}
    </PDFDownloadLink>
  );
};

export default PDFExporter;
