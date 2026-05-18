import { filterIconsByCollection } from '../common';
import type { Icon } from 'src/types';

const makeIcon = (id: string, collection?: string): Icon => {
  return {
    id,
    name: id,
    url: `https://example.com/${id}.svg`,
    ...(collection !== undefined ? { collection } : {})
  };
};

const aws1 = makeIcon('aws-ec2', 'aws');
const aws2 = makeIcon('aws-s3', 'aws');
const gcp1 = makeIcon('gcp-gke', 'gcp');
const custom1 = makeIcon('my-icon', 'my-app');
const noCollection = makeIcon('bare');

describe('filterIconsByCollection', () => {
  test('no filter prop — returns all icons unchanged', () => {
    const icons = [aws1, gcp1, custom1, noCollection];
    expect(filterIconsByCollection(icons, undefined)).toEqual(icons);
  });

  test('empty filter object — returns all icons unchanged', () => {
    const icons = [aws1, gcp1, custom1];
    expect(filterIconsByCollection(icons, {})).toEqual(icons);
  });

  test('allow only — keeps matching collection, drops others', () => {
    const icons = [aws1, aws2, gcp1, custom1];
    const result = filterIconsByCollection(icons, { allow: ['aws'] });
    expect(result).toEqual([aws1, aws2]);
  });

  test('deny only — removes matching collection, keeps others', () => {
    const icons = [aws1, aws2, gcp1, custom1];
    const result = filterIconsByCollection(icons, { deny: ['aws'] });
    expect(result).toEqual([gcp1, custom1]);
  });

  test('allow + deny — allow runs first, deny refines survivors', () => {
    const icons = [aws1, gcp1, custom1];
    const result = filterIconsByCollection(icons, {
      allow: ['aws', 'gcp'],
      deny: ['gcp']
    });
    expect(result).toEqual([aws1]);
  });

  test('case-insensitive — "AWS" matches "aws"', () => {
    const icons = [aws1, gcp1];
    const result = filterIconsByCollection(icons, { deny: ['AWS'] });
    expect(result).toEqual([gcp1]);
  });

  test('icons without collection always pass through allow filter', () => {
    const icons = [aws1, noCollection];
    const result = filterIconsByCollection(icons, { allow: ['aws'] });
    expect(result).toContain(noCollection);
    expect(result).toContain(aws1);
  });

  test('icons without collection always pass through deny filter', () => {
    const icons = [aws1, noCollection];
    const result = filterIconsByCollection(icons, { deny: ['aws'] });
    expect(result).toEqual([noCollection]);
  });
});
