import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, G } from 'react-native-svg';
import { ViewStyle } from 'react-native';
import { colors } from '@/constants/theme';

interface ShootingStarsPatternProps {
  width: number;
  height: number;
  style?: ViewStyle;
  baseColor?: string;
}

export const ShootingStarsPattern = ({
  width,
  height,
  style,
  baseColor = "#FFFFFF",
}: ShootingStarsPatternProps) => {
  // Constant angle for all stars (Upward momentum)
  const angle = 145; 
  
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={style}
    >
      <Defs>
        <LinearGradient id="starTail" x1="1" y1="0" x2="0" y2="0">
          <Stop offset="0" stopColor={baseColor} stopOpacity="0.6" />
          <Stop offset="1" stopColor={baseColor} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Distributed Upward Directional Shooting Stars (Stats Tails) */}
      
      {/* Top Left Area */}
      <G transform={`translate(${width * 0.1}, ${height * 0.2}) rotate(${angle})`}>
        <Path d="M0,0 L60,0" stroke="url(#starTail)" strokeWidth="1.2" strokeLinecap="round" />
        <Circle cx="60" cy="0" r="1.2" fill={baseColor} opacity="0.8" />
      </G>

      {/* Top Right Area */}
      <G transform={`translate(${width * 0.8}, ${height * 0.15}) rotate(${angle})`}>
        <Path d="M0,0 L90,0" stroke="url(#starTail)" strokeWidth="1.5" strokeLinecap="round" />
        <Circle cx="90" cy="0" r="1.5" fill={baseColor} opacity="0.7" />
      </G>

      {/* Center Left Area */}
      <G transform={`translate(${width * 0.25}, ${height * 0.5}) rotate(${angle})`}>
        <Path d="M0,0 L110,0" stroke="url(#starTail)" strokeWidth="2" strokeLinecap="round" />
        <Circle cx="110" cy="0" r="2" fill={baseColor} opacity="0.9" />
      </G>

      {/* Center Right Area */}
      <G transform={`translate(${width * 0.65}, ${height * 0.45}) rotate(${angle})`}>
        <Path d="M0,0 L70,0" stroke="url(#starTail)" strokeWidth="1" strokeLinecap="round" />
        <Circle cx="70" cy="0" r="1" fill={baseColor} opacity="0.6" />
      </G>

      {/* Bottom Center Area */}
      <G transform={`translate(${width * 0.45}, ${height * 0.85}) rotate(${angle})`}>
        <Path d="M0,0 L130,0" stroke="url(#starTail)" strokeWidth="1.8" strokeLinecap="round" />
        <Circle cx="130" cy="0" r="2" fill={baseColor} opacity="0.8" />
      </G>

      {/* Bottom Right Area */}
      <G transform={`translate(${width * 0.9}, ${height * 0.75}) rotate(${angle})`}>
        <Path d="M0,0 L85,0" stroke="url(#starTail)" strokeWidth="1.4" strokeLinecap="round" />
        <Circle cx="85" cy="0" r="1.4" fill={baseColor} opacity="0.5" />
      </G>

      {/* Bottom Left Area */}
      <G transform={`translate(${width * 0.05}, ${height * 0.9}) rotate(${angle})`}>
        <Path d="M0,0 L100,0" stroke="url(#starTail)" strokeWidth="1.5" strokeLinecap="round" />
        <Circle cx="100" cy="0" r="1.5" fill={baseColor} opacity="0.4" />
      </G>

      {/* Random Data Dots for extra texture */}
      <Circle cx={width * 0.4} cy={height * 0.25} r="1" fill={baseColor} opacity="0.3" />
      <Circle cx={width * 0.7} cy={height * 0.6} r="1" fill={baseColor} opacity="0.2" />
      <Circle cx={width * 0.15} cy={height * 0.7} r="1" fill={baseColor} opacity="0.2" />
      <Circle cx={width * 0.5} cy={height * 0.1} r="1.5" fill={baseColor} opacity="0.1" />
    </Svg>
  );
};
