import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { ViewStyle } from 'react-native';
import { colors } from '@/constants/theme';

interface WavePatternProps {
  width: number;
  height: number;
  style?: ViewStyle;
  baseColor?: string;
}

export const WavePattern = ({
  width,
  height,
  style,
  baseColor = colors.primary,
}: WavePatternProps) => {
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={style}
    >
      <Defs>
        <LinearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={baseColor} stopOpacity="0.08" />
          <Stop offset="1" stopColor={baseColor} stopOpacity="0.03" />
        </LinearGradient>
      </Defs>

      {/* Main Wave */}
      <Path
        d={`M0,${height * 0.8} 
           C${width * 0.25},${height * 0.6} 
            ${width * 0.5},${height * 1.0} 
            ${width},${height * 0.7} 
           L${width},${height} 
           L0,${height} Z`}
        fill="url(#waveGradient)"
      />

      {/* Secondary Subtle Layer */}
      <Path
        d={`M0,${height * 0.6} 
           C${width * 0.3},${height * 0.9} 
            ${width * 0.6},${height * 0.4} 
            ${width},${height * 0.8} 
           L${width},${height} 
           L0,${height} Z`}
        fill={baseColor}
        fillOpacity="0.04"
      />
    </Svg>
  );
};