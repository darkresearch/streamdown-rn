import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { ComponentDefinition, ComponentRegistry } from 'streamdown-rn';

// Simple TokenCard component for testing
export const TokenCard: React.FC<{
  tokenSymbol?: string;
  tokenName?: string;
  tokenPrice?: number;
  priceChange24h?: number;
}> = ({ tokenSymbol = 'BTC', tokenName = 'Bitcoin', tokenPrice = 45000, priceChange24h = 2.5 }) => {
  const isPositive = (priceChange24h || 0) >= 0;
  
  return (
    <View style={styles.tokenCard}>
      <View style={styles.tokenHeader}>
        <Text style={styles.tokenSymbol}>{tokenSymbol}</Text>
        <Text style={styles.tokenName}>{tokenName}</Text>
      </View>
      <View style={styles.tokenPriceRow}>
        <Text style={styles.tokenPrice}>${tokenPrice.toLocaleString()}</Text>
        <Text style={[styles.priceChange, isPositive ? styles.positive : styles.negative]}>
          {isPositive ? '+' : ''}{priceChange24h?.toFixed(2)}%
        </Text>
      </View>
    </View>
  );
};

// Simple Button component for testing
export const Button: React.FC<{
  label?: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
}> = ({ label = 'Click me', onPress, variant = 'primary' }) => {
  return (
    <TouchableOpacity
      style={[styles.button, variant === 'primary' ? styles.buttonPrimary : styles.buttonSecondary]}
      onPress={onPress}
    >
      <Text style={[styles.buttonText, variant === 'primary' ? styles.buttonTextPrimary : styles.buttonTextSecondary]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// Simple Badge component for testing
export const Badge: React.FC<{
  text?: string;
  color?: string;
}> = ({ text = 'Badge', color = '#494C53' }) => {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tokenCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  tokenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tokenSymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#D7D7D7',
    marginRight: 8,
  },
  tokenName: {
    fontSize: 14,
    color: '#737373',
  },
  tokenPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tokenPrice: {
    fontSize: 24,
    fontWeight: '600',
    color: '#D7D7D7',
  },
  priceChange: {
    fontSize: 14,
    fontWeight: '500',
  },
  positive: {
    color: '#4CAF50',
  },
  negative: {
    color: '#F44336',
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    marginVertical: 4,
  },
  buttonPrimary: {
    backgroundColor: '#494C53',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#494C53',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  buttonTextPrimary: {
    color: '#D7D7D7',
  },
  buttonTextSecondary: {
    color: '#737373',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#D7D7D7',
  },
});

// Create component registry
export function createTestComponentRegistry(): ComponentRegistry {
  const components: ComponentDefinition[] = [
    {
      name: 'TokenCard',
      component: TokenCard,
      category: 'dynamic',
      description: 'Displays token information',
      propsSchema: {
        type: 'object',
        properties: {
          tokenSymbol: { type: 'string' },
          tokenName: { type: 'string' },
          tokenPrice: { type: 'number' },
          priceChange24h: { type: 'number' },
        },
      },
    },
    {
      name: 'Button',
      component: Button,
      category: 'dynamic',
      description: 'A simple button component',
      propsSchema: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          variant: { type: 'string', enum: ['primary', 'secondary'] },
        },
      },
    },
    {
      name: 'Badge',
      component: Badge,
      category: 'dynamic',
      description: 'A badge component',
      propsSchema: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          color: { type: 'string' },
        },
      },
    },
  ];

  const componentMap = new Map(components.map(c => [c.name, c]));

  return {
    get(name: string) {
      return componentMap.get(name);
    },
    has(name: string) {
      return componentMap.has(name);
    },
    validate(name: string, props: any) {
      const def = componentMap.get(name);
      if (!def) {
        return { valid: false, errors: [`Component '${name}' not found`] };
      }

      const schema = def.propsSchema;
      const errors: string[] = [];

      if (schema.required) {
        for (const field of schema.required) {
          if (!(field in props)) {
            errors.push(`Missing required field: ${field}`);
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    },
  };
}

