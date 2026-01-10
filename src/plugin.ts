/**
 * Filename Parser Plugin
 * Parses video filenames to extract title, season, episode, year
 * Uses @metazla/filename-tools library for parsing
 */

import type { PluginManifest, ProcessRequest, CallbackPayload } from './types.js';
import { MetaCoreClient } from './meta-core-client.js';
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

export const manifest: PluginManifest = {
    id: 'filename-parser',
    name: 'Filename Parser',
    version: '1.0.0',
    description: 'Parses video filenames to extract title, season, episode, year, and quality',
    author: 'MetaMesh',
    dependencies: ['file-info'],
    priority: 20,
    color: '#2196F3',
    defaultQueue: 'fast',
    timeout: 30000,
    schema: {
        originalTitle: { label: 'Original Title', type: 'string' },
        videoType: { label: 'Video Type', type: 'string', hint: 'movie or tvshow' },
        season: { label: 'Season', type: 'string' },
        episode: { label: 'Episode', type: 'string' },
        movieYear: { label: 'Year', type: 'number' },
    },
    config: {},
};

// Create extractor instance with default config
const extractor = new FileNameVideoMetaExtractor(
    [], // watchFolderList - empty for plugin context
    episodePatterns,
    seasonAndEpisodePatterns,
    seasonPatterns,
    extraEpKeyWords,
    keywordsArray,
    substringArray,
    soloEp
);

export async function process(
    request: ProcessRequest,
    sendCallback: (payload: CallbackPayload) => Promise<void>
): Promise<void> {
    const startTime = Date.now();
    const metaCore = new MetaCoreClient(request.metaCoreUrl);

    try {
        const { cid, filePath } = request;

        // Use the library to extract metadata
        const metadata = extractor.extractVideoFileMetadata(filePath);

        // Convert to record for merging
        const result: Record<string, string> = {};
        if (metadata.originalTitle) result.originalTitle = metadata.originalTitle;
        if (metadata.season) result.season = metadata.season;
        if (metadata.episode) result.episode = metadata.episode;
        if (metadata.increment) result.increment = metadata.increment;
        if (metadata.movieYear) result.movieYear = metadata.movieYear;
        if (metadata.videoType) result.videoType = metadata.videoType;
        if (metadata.extra) result.extra = metadata.extra;

        if (Object.keys(result).length > 0) {
            await metaCore.mergeMetadata(cid, result);
        }

        await sendCallback({
            taskId: request.taskId,
            status: 'completed',
            duration: Date.now() - startTime,
        });
    } catch (error) {
        await sendCallback({
            taskId: request.taskId,
            status: 'failed',
            duration: Date.now() - startTime,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
