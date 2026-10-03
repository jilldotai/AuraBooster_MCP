import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as storage from './storage.js';
import fs from 'node:fs/promises';
import path from 'node:path';

// Mock fs to avoid writing to actual files during tests
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    default: {
      ...actual,
      mkdir: vi.fn().mockResolvedValue(undefined),
      access: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn(),
      writeFile: vi.fn().mockResolvedValue(undefined),
    }
  };
});

describe('storage.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLogs', () => {
    it('should return empty array if no logs exist', async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce('[]');
      const logs = await storage.getLogs();
      expect(logs).toEqual([]);
    });

    it('should return parsed logs', async () => {
      const mockLogs = [{ id: '1', type: 'marketing_generated', summary: 'test log', timestamp: new Date().toISOString() }];
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockLogs));
      const logs = await storage.getLogs();
      expect(logs).toEqual(mockLogs);
    });
  });

  describe('getCampaigns', () => {
    it('should return empty array if no campaigns exist', async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce('[]');
      const campaigns = await storage.getCampaigns();
      expect(campaigns).toEqual([]);
    });

    it('should return parsed campaigns', async () => {
      const mockCampaigns = [{ id: '1', topic: 'test', channel: 'x_twitter', brand: 'test brand', timestamp: new Date().toISOString(), tone: 'test', content: {} }];
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockCampaigns));
      const campaigns = await storage.getCampaigns();
      expect(campaigns).toEqual(mockCampaigns);
    });
  });

  describe('getMilestones', () => {
    it('should return empty array if no milestones exist', async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce('[]');
      const milestones = await storage.getMilestones();
      expect(milestones).toEqual([]);
    });

    it('should return parsed milestones', async () => {
      const mockMilestones = [{ id: '1', title: 'test', description: 'desc', category: 'feature', timestamp: new Date().toISOString() }];
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockMilestones));
      const milestones = await storage.getMilestones();
      expect(milestones).toEqual(mockMilestones);
    });
  });

  describe('getHackathonDoc', () => {
    it('should return the document content', async () => {
      const mockContent = '# Test Doc';
      vi.mocked(fs.readFile).mockResolvedValueOnce(mockContent);
      const doc = await storage.getHackathonDoc();
      expect(doc).toBe(mockContent);
    });
  });

  describe('updateHackathonDoc', () => {
    it('should write the new markdown content', async () => {
      // Mock appendLog which is called by updateHackathonDoc
      const originalReadFile = fs.readFile;
      vi.mocked(fs.readFile).mockResolvedValueOnce('[]'); // for appendLog

      await storage.updateHackathonDoc('# New Doc');

      expect(fs.writeFile).toHaveBeenCalledWith(
        storage.HACKATHON_DOC_FILE,
        '# New Doc',
        'utf-8'
      );
    });
  });

  describe('syncHackathonDoc', () => {
    it('should generate doc with empty milestones and campaigns', async () => {
      // getMilestones calls
      vi.mocked(fs.readFile).mockResolvedValueOnce('[]');
      // getCampaigns calls
      vi.mocked(fs.readFile).mockResolvedValueOnce('[]');

      const doc = await storage.syncHackathonDoc();

      expect(doc).toContain('No milestones recorded yet.');
      expect(doc).toContain('No active marketing campaigns recorded yet.');
      expect(fs.writeFile).toHaveBeenCalledWith(
        storage.HACKATHON_DOC_FILE,
        doc,
        'utf-8'
      );
    });

    it('should generate doc with milestones and campaigns', async () => {
      const mockMilestones = [{
        id: '1',
        title: 'MS1',
        description: 'desc1',
        category: 'feature' as const,
        timestamp: new Date().toISOString(),
        metrics: { 'speed': 'fast' }
      }];
      const mockCampaigns = [{
        id: '1',
        topic: 'Camp1',
        channel: 'x_twitter' as const,
        brand: 'brand1',
        timestamp: new Date().toISOString(),
        tone: 'test',
        content: {}
      }];

      // getMilestones calls
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockMilestones));
      // getCampaigns calls
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockCampaigns));

      const doc = await storage.syncHackathonDoc();

      expect(doc).toContain('MS1');
      expect(doc).toContain('desc1');
      expect(doc).toContain('Camp1');
      expect(doc).toContain('speed');
      expect(doc).toContain('fast');
    });
  });
});
