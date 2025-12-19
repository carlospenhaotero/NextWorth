import React from 'react';
import '../styles/pieChart.css';

const PieChart = ({ data, totalValue }) => {
  if (!data || data.length === 0 || totalValue === 0) {
    return (
      <div className="pie-chart-empty">
        <p>No data to display</p>
      </div>
    );
  }

  // Paleta "Unique Orange": Tonos naranjas, dorados y rojizos para un look premium
  const colors = [
    { start: '#f97316', end: '#ea580c' }, // Bright Orange
    { start: '#fbbf24', end: '#d97706' }, // Amber/Gold
    { start: '#f43f5e', end: '#e11d48' }, // Rose/Red (accent)
    { start: '#fdba74', end: '#fb923c' }, // Light Orange
    { start: '#c2410c', end: '#9a3412' }, // Deep Rust
    { start: '#fcd34d', end: '#f59e0b' }, // Yellow/Gold
  ];

  // Calcular los ángulos para cada segmento
  let currentAngle = -90; // Empezar desde arriba
  const segments = data.map((item, index) => {
    const percentage = (item.value / totalValue) * 100;
    const angle = (item.value / totalValue) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;

    // Asignar color cíclicamente
    const colorObj = colors[index % colors.length];

    return {
      ...item,
      percentage: percentage.toFixed(1),
      startAngle,
      angle,
      colorStart: colorObj.start,
      colorEnd: colorObj.end,
      gradientId: `gradient-${index}`,
    };
  });

  // Función para calcular el punto en el círculo
  const getPoint = (angle, radius) => {
    const rad = (angle * Math.PI) / 180;
    const x = 50 + radius * Math.cos(rad);
    const y = 50 + radius * Math.sin(rad);
    return { x, y };
  };

  // Función para generar el path del arco SVG
  const createArcPath = (startAngle, endAngle, innerRadius, outerRadius) => {
    // Evitar errores de renderizado si el ángulo es 360 o muy cercano
    if (endAngle - startAngle >= 360) {
      endAngle = startAngle + 359.99;
    }

    const start = getPoint(startAngle, outerRadius);
    const end = getPoint(endAngle, outerRadius);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    const path = [
      `M ${getPoint(startAngle, innerRadius).x} ${getPoint(startAngle, innerRadius).y}`,
      `L ${start.x} ${start.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${end.x} ${end.y}`,
      `L ${getPoint(endAngle, innerRadius).x} ${getPoint(endAngle, innerRadius).y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${getPoint(startAngle, innerRadius).x} ${getPoint(startAngle, innerRadius).y}`,
      'Z',
    ].join(' ');

    return path;
  };

  return (
    <div className="pie-chart-container">
      <div className="pie-chart-wrapper">
        <svg viewBox="0 0 100 100" className="pie-chart">
          <defs>
            {segments.map((segment, index) => (
              <linearGradient key={index} id={segment.gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={segment.colorStart} />
                <stop offset="100%" stopColor={segment.colorEnd} />
              </linearGradient>
            ))}
            {/* Glow effect filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {segments.map((segment, index) => {
            const endAngle = segment.startAngle + segment.angle;
            return (
              <path
                key={index}
                d={createArcPath(segment.startAngle, endAngle, 35, 48)}
                fill={`url(#${segment.gradientId})`}
                stroke="#0f172a"
                strokeWidth="1"
                className="pie-segment"
              />
            );
          })}

          {/* Center Circle - Dark to match theme */}
          <circle cx="50" cy="50" r="34" fill="#0f172a" fillOpacity="0.8" />

          <text x="50" y="43" textAnchor="middle" dominantBaseline="central" className="pie-center-text">
            {segments.length}
          </text>
          <text x="50" y="61" textAnchor="middle" dominantBaseline="central" className="pie-center-label">
            Assets
          </text>
        </svg>
      </div>
      <div className="pie-legend">
        {segments.map((segment, index) => (
          <div key={index} className="legend-item">
            <div
              className="legend-color"
              style={{ background: `linear-gradient(135deg, ${segment.colorStart}, ${segment.colorEnd})` }}
            />
            <div className="legend-info">
              <span className="legend-name">
                {segment.fullName || segment.name}
              </span>
              <span className="legend-symbol">{segment.name}</span>
              <span className="legend-percentage">{segment.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PieChart;
