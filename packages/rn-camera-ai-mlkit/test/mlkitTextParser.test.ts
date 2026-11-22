import { describe, expect, test } from 'bun:test';
import {
  classifyOcrEntity,
  extractStructuredOcrData,
  parseMLKitTextResult,
  type MLKitTextRecognitionResult,
} from '../src';

describe('packages/rn-camera-ai-mlkit > mlkitTextParser', () => {
  test('classifyOcrEntity classifies NIK, email, phone, URL, currency, number, and text', () => {
    expect(classifyOcrEntity('3273011505990001')).toBe('nik');
    expect(classifyOcrEntity('masum@example.com')).toBe('email');
    expect(classifyOcrEntity('+62 812-3456-7890')).toBe('phone');
    expect(classifyOcrEntity('081234567890')).toBe('phone');
    expect(classifyOcrEntity('https://lib.masumdev.id/rn-camera-ai')).toBe('url');
    expect(classifyOcrEntity('Rp 150.000')).toBe('currency');
    expect(classifyOcrEntity('$49.99')).toBe('currency');
    expect(classifyOcrEntity('20261122')).toBe('number');
    expect(classifyOcrEntity('PROVINSI JAWA BARAT')).toBe('text');
  });

  test('parseMLKitTextResult normalizes ML Kit bounds.left/top pixels into [0..1] boxes across granularities', () => {
    const sampleResult: MLKitTextRecognitionResult = {
      text: 'NIK 3273011505990001\nmasum@example.com\nRp 75.000',
      blocks: [
        {
          text: 'NIK 3273011505990001\nmasum@example.com',
          bounds: {
            x: 360,
            y: 300,
            width: 400,
            height: 120,
            left: 160,
            top: 240,
            right: 560,
            bottom: 360,
          },
          corners: [
            { x: 160, y: 240 },
            { x: 560, y: 240 },
            { x: 560, y: 360 },
            { x: 160, y: 360 },
          ],
          languages: ['id'],
          lines: [
            {
              text: '3273011505990001',
              bounds: {
                x: 360,
                y: 265,
                width: 360,
                height: 40,
                left: 180,
                top: 245,
                right: 540,
                bottom: 285,
              },
              confidence: 0.96,
              angle: 1.5,
              languages: ['id'],
              elements: [
                {
                  text: '3273011505990001',
                  bounds: {
                    x: 360,
                    y: 265,
                    width: 360,
                    height: 40,
                    left: 180,
                    top: 245,
                    right: 540,
                    bottom: 285,
                  },
                  confidence: 0.96,
                  angle: 1.5,
                  languages: ['id'],
                },
              ],
            },
            {
              text: 'masum@example.com',
              bounds: {
                x: 340,
                y: 330,
                width: 320,
                height: 36,
                left: 180,
                top: 312,
                right: 500,
                bottom: 348,
              },
              confidence: 0.89,
              angle: 0.2,
              languages: ['en'],
              elements: [
                {
                  text: 'masum@example.com',
                  bounds: {
                    x: 340,
                    y: 330,
                    width: 320,
                    height: 36,
                    left: 180,
                    top: 312,
                    right: 500,
                    bottom: 348,
                  },
                  confidence: 0.89,
                  angle: 0.2,
                  languages: ['en'],
                },
              ],
            },
          ],
        },
        {
          text: 'Rp 75.000',
          bounds: {
            x: 300,
            y: 640,
            width: 180,
            height: 40,
            left: 210,
            top: 620,
            right: 390,
            bottom: 660,
          },
          languages: ['id'],
          lines: [
            {
              text: 'Rp 75.000',
              bounds: {
                x: 300,
                y: 640,
                width: 180,
                height: 40,
                left: 210,
                top: 620,
                right: 390,
                bottom: 660,
              },
              confidence: 0.94,
              angle: 0,
              languages: ['id'],
              elements: [],
            },
          ],
        },
      ],
    };

    const lineDetections = parseMLKitTextResult(sampleResult, 720, 1280, {
      granularity: 'line',
    });
    expect(lineDetections.length).toBe(3);
    expect(lineDetections[0].label).toBe('3273011505990001');
    expect(lineDetections[0].boundingBox.x).toBeCloseTo(180 / 720, 4);
    expect(lineDetections[0].boundingBox.y).toBeCloseTo(245 / 1280, 4);
    expect(lineDetections[0].boundingBox.width).toBeCloseTo(360 / 720, 4);
    expect(lineDetections[0].boundingBox.height).toBeCloseTo(40 / 1280, 4);
    expect(lineDetections[0].ocr?.category).toBe('nik');
    expect(lineDetections[1].ocr?.category).toBe('email');
    expect(lineDetections[2].ocr?.category).toBe('currency');

    const blockDetections = parseMLKitTextResult(sampleResult, 720, 1280, {
      granularity: 'block',
    });
    expect(blockDetections.length).toBe(2);
    expect(blockDetections[0].ocr?.granularity).toBe('block');
    expect(blockDetections[0].ocr?.corners?.length).toBe(4);

    const nikOnly = parseMLKitTextResult(sampleResult, 720, 1280, {
      granularity: 'element',
      entityFilter: 'nik',
    });
    expect(nikOnly.length).toBe(1);
    expect(nikOnly[0].label).toBe('3273011505990001');
  });

  test('extractStructuredOcrData extracts deduplicated NIKs, emails, phones, URLs, and currencies', () => {
    const sampleDoc = `
      Nama: Ma'sum
      NIK: 3273011505990001
      Email: masum@example.com / masum@example.com
      Telp: +62 812-3456-7890 atau 081987654321
      Website: https://lib.masumdev.id
      Total: Rp 250.000
    `;

    const extracted = extractStructuredOcrData(sampleDoc);
    expect(extracted.niks).toEqual(['3273011505990001']);
    expect(extracted.emails).toEqual(['masum@example.com']);
    expect(extracted.phones.length).toBe(2);
    expect(extracted.urls).toEqual(['https://lib.masumdev.id']);
    expect(extracted.currencies).toEqual(['Rp 250.000']);
  });
});
