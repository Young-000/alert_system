interface LineChipProps {
  line: string;
  size?: 'default' | 'small';
  onClick?: () => void;
  selected?: boolean;
}

// 노선별 색상 매핑
const LINE_COLORS: Record<string, string> = {
  '1호선': '#0052A4',
  '2호선': '#00A84D',
  '3호선': '#EF7C1C',
  '4호선': '#00A5DE',
  '5호선': '#996CAC',
  '6호선': '#CD7C2F',
  '7호선': '#747F00',
  '8호선': '#E6186C',
  '9호선': '#BDB092',
  '경의중앙선': '#77C4A3',
  '경춘선': '#0C8E72',
  '수인분당선': '#FABE00',
  '신분당선': '#D31145',
  '공항철도': '#0090D2',
  '우이신설선': '#B0CE18',
  'GTX-A': '#9A6292',
  '인천1호선': '#7CA8D5',
  '인천2호선': '#ED8B00',
  '김포골드라인': '#AD8605',
  '신림선': '#6789CA',
  '의정부경전철': '#FDA600',
  '용인에버라인': '#509F22',
};

function getLineColor(line: string): string {
  // 정확히 일치하는 경우
  if (LINE_COLORS[line]) return LINE_COLORS[line];

  // 부분 일치 (예: "2호선" in "수도권 2호선")
  for (const [key, color] of Object.entries(LINE_COLORS)) {
    if (line.includes(key) || key.includes(line)) return color;
  }

  // 기본 색상
  return '#666';
}

export function LineChip({ line, size = 'default', onClick, selected }: LineChipProps) {
  const bgColor = getLineColor(line);
  const Tag = onClick ? 'button' : 'span';

  return (
    <Tag
      className={`line-chip ${size === 'small' ? 'line-chip-sm' : ''} ${selected ? 'selected' : ''}`}
      style={{ '--line-color': bgColor } as React.CSSProperties}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      role={onClick ? 'radio' : undefined}
      aria-checked={onClick ? selected : undefined}
    >
      {line}
    </Tag>
  );
}

// 유틸리티 함수 export
export { getLineColor };
