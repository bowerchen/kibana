/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { ANALYTICS_COLLECTIONS_INDEX } from '../..';
import { AnalyticsCollection } from '../../../common/types/analytics';

import { ErrorCode } from '../../../common/types/error_codes';
import { fetchIndices } from '../indices/fetch_indices';

import { deleteAnalyticsCollectionByName } from './delete_analytics_collection';
import { fetchAnalyticsCollectionByName } from './fetch_analytics_collection';

jest.mock('../indices/fetch_indices', () => ({
  fetchIndices: jest.fn(),
}));

jest.mock('./fetch_analytics_collection', () => ({
  fetchAnalyticsCollectionByName: jest.fn(),
}));

describe('delete analytics collection lib function', () => {
  const mockClient = {
    asCurrentUser: {
      delete: jest.fn(),
      indices: {
        delete: jest.fn(),
      },
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('deleting analytics collections', () => {
    it('should delete an analytics collection and its events indices', async () => {
      const indices = [
        {
          name: 'elastic_analytics-events-my-collection-12.12.12',
        },
        {
          name: 'elastic_analytics-events-my-collection-13.12.12',
        },
      ];
      (fetchIndices as jest.Mock).mockImplementationOnce(() => {
        return Promise.resolve(indices);
      });
      (fetchAnalyticsCollectionByName as jest.Mock).mockImplementationOnce(() => {
        return Promise.resolve({
          event_retention_day_length: 180,
          id: 'example-id',
          name: 'example',
        } as AnalyticsCollection);
      });

      await expect(
        deleteAnalyticsCollectionByName(mockClient as unknown as IScopedClusterClient, 'example')
      ).resolves.toBeUndefined();

      expect(mockClient.asCurrentUser.delete).toHaveBeenCalledWith({
        id: 'example-id',
        index: ANALYTICS_COLLECTIONS_INDEX,
      });

      expect(mockClient.asCurrentUser.indices.delete).toHaveBeenCalledWith({
        ignore_unavailable: true,
        index: indices.map((index) => index.name),
      });
    });

    it('should throw an exception when analytics collection does not exist', async () => {
      const indices = [
        {
          name: 'elastic_analytics-events-my-collection-12.12.12',
        },
        {
          name: 'elastic_analytics-events-my-collection-13.12.12',
        },
      ];
      (fetchIndices as jest.Mock).mockImplementationOnce(() => {
        return Promise.resolve(indices);
      });
      (fetchAnalyticsCollectionByName as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve(undefined)
      );

      await expect(
        deleteAnalyticsCollectionByName(mockClient as unknown as IScopedClusterClient, 'example')
      ).rejects.toEqual(new Error(ErrorCode.ANALYTICS_COLLECTION_NOT_FOUND));

      expect(mockClient.asCurrentUser.delete).not.toHaveBeenCalled();
      expect(mockClient.asCurrentUser.indices.delete).not.toBeCalled();
    });
  });
});
