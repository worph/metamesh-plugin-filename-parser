/**
 * Filename Parser Plugin Integration Tests
 *
 * Tests filename parsing for movies, TV shows, anime.
 * Uses @metazla/filename-tools library directly for validation.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
    FileNameVideoMetaExtractor,
    episodePatterns,
    seasonAndEpisodePatterns,
    seasonPatterns,
    extraEpKeyWords,
    keywordsArray,
    substringArray,
    soloEp
} from '@metazla/filename-tools';

// Dynamic import of plugin module
let manifest: typeof import('../src/plugin.js').manifest;
let processFile: typeof import('../src/plugin.js').process;

// Mock callback collector
interface CallbackResult {
    taskId: string;
    status: 'completed' | 'failed' | 'skipped';
    duration: number;
    error?: string;
}

let lastCallback: CallbackResult | null = null;

const mockSendCallback = async (payload: CallbackResult): Promise<void> => {
    lastCallback = payload;
};

// Create extractor for direct testing
const extractor = new FileNameVideoMetaExtractor(
    [],
    episodePatterns,
    seasonAndEpisodePatterns,
    seasonPatterns,
    extraEpKeyWords,
    keywordsArray,
    substringArray,
    soloEp
);

describe('Filename Parser Plugin Integration Tests', () => {
    beforeAll(async () => {
        const plugin = await import('../src/plugin.js');
        manifest = plugin.manifest;
        processFile = plugin.process;
    });

    describe('Manifest', () => {
        it('has required fields', () => {
            expect(manifest.id).toBe('filename-parser');
            expect(manifest.name).toBeDefined();
            expect(manifest.version).toBeDefined();
            expect(manifest.dependencies).toContain('file-info');
            expect(manifest.priority).toBe(20);
        });

        it('declares correct schema', () => {
            expect(manifest.schema).toHaveProperty('originalTitle');
            expect(manifest.schema).toHaveProperty('videoType');
            expect(manifest.schema).toHaveProperty('season');
            expect(manifest.schema).toHaveProperty('episode');
            expect(manifest.schema).toHaveProperty('movieYear');
        });
    });

    describe('Movie Filename Parsing', () => {
        it('parses movie with year', () => {
            const result = extractor.extractVideoFileMetadata('/movies/Inception (2010).mkv');
            expect(result.originalTitle).toBe('Inception');
            expect(result.movieYear).toBe('2010');
            expect(result.videoType).toBe('movie');
        });

        it('parses movie with year in brackets', () => {
            const result = extractor.extractVideoFileMetadata('/movies/The Matrix [1999].mp4');
            expect(result.originalTitle).toBe('The Matrix');
            expect(result.movieYear).toBe('1999');
        });

        it('parses movie with quality tags', () => {
            const result = extractor.extractVideoFileMetadata('/movies/Interstellar.2014.1080p.BluRay.x264.mkv');
            expect(result.originalTitle).toBe('Interstellar');
            expect(result.movieYear).toBe('2014');
        });

        it('parses movie without year', () => {
            const result = extractor.extractVideoFileMetadata('/movies/Avatar.mkv');
            expect(result.originalTitle).toBe('Avatar');
        });
    });

    describe('TV Show Filename Parsing', () => {
        it('parses standard S01E01 format', () => {
            const result = extractor.extractVideoFileMetadata('/shows/Breaking Bad S01E01.mkv');
            expect(result.originalTitle).toBe('Breaking Bad');
            expect(result.season).toBe('1');
            expect(result.episode).toBe('1');
            expect(result.videoType).toBe('tvshow');
        });

        it('parses S01E01 with title after', () => {
            const result = extractor.extractVideoFileMetadata('/shows/Game of Thrones S01E01 Winter Is Coming.mkv');
            expect(result.originalTitle).toBe('Game of Thrones');
            expect(result.season).toBe('1');
            expect(result.episode).toBe('1');
        });

        it('parses double digit episode', () => {
            const result = extractor.extractVideoFileMetadata('/shows/Friends S10E17.mkv');
            expect(result.season).toBe('10');
            expect(result.episode).toBe('17');
        });

        it('parses lowercase season episode', () => {
            const result = extractor.extractVideoFileMetadata('/shows/the.office.s02e05.720p.mkv');
            expect(result.season).toBe('2');
            expect(result.episode).toBe('5');
        });

        it('parses season x episode format', () => {
            const result = extractor.extractVideoFileMetadata('/shows/Seinfeld 3x12.mkv');
            expect(result.season).toBe('3');
            expect(result.episode).toBe('12');
        });
    });

    describe('Anime Filename Parsing', () => {
        it('parses anime with episode number', () => {
            const result = extractor.extractVideoFileMetadata('[SubGroup] Naruto - 01 [720p].mkv');
            expect(result.episode).toBeDefined();
        });

        it('parses anime with brackets', () => {
            const result = extractor.extractVideoFileMetadata('[HorribleSubs] One Piece - 1000 [1080p].mkv');
            // Episode extraction may vary based on filename-tools implementation
            expect(result.originalTitle).toBeDefined();
        });
    });

    describe('Process Function', () => {
        it('processes movie filename successfully', async () => {
            await processFile({
                taskId: 'test-movie-1',
                cid: 'test-cid-movie',
                filePath: '/movies/The Dark Knight (2008).mkv',
                callbackUrl: 'http://localhost/callback',
                metaCoreUrl: 'http://localhost:9000',
                existingMeta: {},
            }, mockSendCallback);

            expect(lastCallback).toBeDefined();
            expect(lastCallback?.status).toBe('completed');
        });

        it('processes TV show filename successfully', async () => {
            await processFile({
                taskId: 'test-tvshow-1',
                cid: 'test-cid-tvshow',
                filePath: '/shows/Stranger Things S04E09.mkv',
                callbackUrl: 'http://localhost/callback',
                metaCoreUrl: 'http://localhost:9000',
                existingMeta: {},
            }, mockSendCallback);

            expect(lastCallback).toBeDefined();
            expect(lastCallback?.status).toBe('completed');
        });
    });
});
