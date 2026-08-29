// src/components/PdfViewer.web.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';

interface PdfViewerProps {
  uri: string;
  page: number;
  isNightMode: boolean;
  onPageChanged: (page: number, numberOfPages: number) => void;
  onLoadComplete: (numberOfPages: number) => void;
}

export default function PdfViewer({ uri, isNightMode }: PdfViewerProps) {
  return (
    <View style={styles.container}>
      <iframe
        src={uri}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          filter: isNightMode ? 'invert(0.9) hue-rotate(180deg)' : 'none',
        }}
        title="PDF Viewer"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});