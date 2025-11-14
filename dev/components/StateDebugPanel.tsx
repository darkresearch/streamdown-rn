/**
 * State Debug Panel
 * 
 * Visualizes incomplete tag state for debugging during development
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { IncompleteTagState } from '../../src/core/types';

interface StateDebugPanelProps {
  state: IncompleteTagState;
  currentText: string;
  onClose?: () => void;
}

// Color mapping for tag types
const TAG_COLORS: Record<string, string> = {
  bold: '#FF6B6B',
  italic: '#4ECDC4',
  code: '#FFE66D',
  codeBlock: '#95E1D3',
  link: '#A8E6CF',
  component: '#C7CEEA',
};

export function StateDebugPanel({ state, currentText, onClose }: StateDebugPanelProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>State Debug Panel</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {/* Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Text Length:</Text>
            <Text style={styles.statValue}>{currentText.length} chars</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Stack Size:</Text>
            <Text style={styles.statValue}>{state.stack.length} tags</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Earliest Position:</Text>
            <Text style={styles.statValue}>{state.earliestPosition}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Processing Length:</Text>
            <Text style={styles.statValue}>
              {currentText.length - state.earliestPosition} chars
            </Text>
          </View>
        </View>

        {/* Tag Counts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tag Counts</Text>
          {Object.entries(state.tagCounts).map(([type, count]) => (
            <View key={type} style={styles.stat}>
              <View style={styles.tagLabel}>
                <View style={[styles.tagDot, { backgroundColor: TAG_COLORS[type] }]} />
                <Text style={styles.statLabel}>{type}:</Text>
              </View>
              <Text style={styles.statValue}>{count}</Text>
            </View>
          ))}
        </View>

        {/* Stack Contents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stack ({state.stack.length})</Text>
          {state.stack.length === 0 ? (
            <Text style={styles.emptyText}>No incomplete tags</Text>
          ) : (
            state.stack.map((tag, index) => (
              <View key={index} style={styles.stackItem}>
                <View style={styles.stackItemHeader}>
                  <View style={styles.tagLabel}>
                    <View style={[styles.tagDot, { backgroundColor: TAG_COLORS[tag.type] }]} />
                    <Text style={styles.tagType}>{tag.type}</Text>
                  </View>
                  <Text style={styles.tagMarker}>{tag.marker}</Text>
                </View>
                <View style={styles.stackItemBody}>
                  <Text style={styles.tagDetail}>
                    Position: {tag.position}
                  </Text>
                  {tag.openingText && (
                    <Text style={styles.tagPreview} numberOfLines={1}>
                      "{tag.openingText}"
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Processing Boundary Visualization */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Processing Boundary</Text>
          {state.earliestPosition > 0 && (
            <View style={styles.boundaryVisualization}>
              <View style={styles.processedPortion}>
                <Text style={styles.portionLabel}>Skipped (cached)</Text>
                <Text style={styles.portionText} numberOfLines={2}>
                  {currentText.slice(0, state.earliestPosition)}
                </Text>
                <Text style={styles.portionSize}>
                  {state.earliestPosition} chars
                </Text>
              </View>
              <View style={styles.boundarySeparator} />
              <View style={styles.processingPortion}>
                <Text style={styles.portionLabel}>Processing</Text>
                <Text style={styles.portionText} numberOfLines={2}>
                  {currentText.slice(state.earliestPosition)}
                </Text>
                <Text style={styles.portionSize}>
                  {currentText.length - state.earliestPosition} chars
                </Text>
              </View>
            </View>
          )}
          {state.earliestPosition === 0 && currentText.length > 0 && (
            <Text style={styles.emptyText}>Processing entire text (no cached portion)</Text>
          )}
          {currentText.length === 0 && (
            <Text style={styles.emptyText}>No text</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    right: 10,
    width: 350,
    maxHeight: 600,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#F8F8F8',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A2A2A',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
    lineHeight: 28,
  },
  content: {
    maxHeight: 550,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2A2A2A',
    marginBottom: 12,
  },
  stat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2A2A2A',
  },
  tagLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stackItem: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#E5E5E5',
  },
  stackItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2A2A2A',
  },
  tagMarker: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#666',
    backgroundColor: '#EFEFEF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stackItemBody: {
    gap: 4,
  },
  tagDetail: {
    fontSize: 12,
    color: '#666',
  },
  tagPreview: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#999',
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  boundaryVisualization: {
    gap: 8,
  },
  processedPortion: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#93C5FD',
  },
  boundarySeparator: {
    height: 2,
    backgroundColor: '#E5E5E5',
    marginVertical: 4,
  },
  processingPortion: {
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FDBA74',
  },
  portionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  portionText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#2A2A2A',
    marginBottom: 6,
  },
  portionSize: {
    fontSize: 10,
    color: '#999',
  },
});

