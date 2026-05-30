export type LayoutStyle = 'professional' | 'creative' | 'minimal' | 'tech' | 'business';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface ThemeFonts {
  title: string;
  body: string;
}

export interface DesignTheme {
  name: string;
  label: string;
  description: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  layout_style: LayoutStyle;
}

export interface CardColors {
  blue: string;
  green: string;
  yellow: string;
  red: string;
}

export interface BrandStyle {
  theme: DesignTheme;
  card_colors: CardColors;
  logo_url?: string;
}

export interface SlideShape {
  type: string;
  left: number;
  top: number;
  width: number;
  height: number;
  text?: string;
  font_size?: number;
  font_bold?: boolean;
  font_color?: string;
  fill_color?: string;
  table?: string[][];
  image_url?: string;
}

export interface SlideData {
  index: number;
  shapes: SlideShape[];
  background?: string;
  notes?: string;
}

export interface PPTPreviewData {
  filename: string;
  total_slides: number;
  slide_width: number;
  slide_height: number;
  slides: SlideData[];
  design_system?: BrandStyle;
}

export interface ThemeListItem {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
}
