import React from 'react'

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ style, ...props }) => (
  <button {...props} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', ...style }} />
)
