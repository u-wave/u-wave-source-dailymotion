import got from 'got';
import getArtistTitle, { fallBackToArtist } from 'get-artist-title';

function normalizeMedia(media) {
  const [artist, title] = getArtistTitle(media.title, [
    'base',
    fallBackToArtist(media.soundtrack_artist || media['owner.username'])
  ]);

  return {
    sourceID: media.id,
    artist,
    title,
    duration: media.duration,
    thumbnail: media.thumbnail_360_url,
    restricted: []
  };
}

export function getVideoID(url) {
  const match = /\/video\/([kx][a-zA-Z0-9]+)($|_)/.exec(url);
  if (match) {
    return match[1];
  }
  return null;
}

const defaultOptions = {
  api: 'https://api.dailymotion.com/',
  fields: [
    'id',
    'title',
    'owner.username',
    'allow_embed',
    'duration',
    'explicit',
    'soundtrack_artist',
    'thumbnail_360_url'
  ]
};

export default function dailymotionSource(uw, userOptions = {}) {
  const opts = {
    ...defaultOptions,
    ...userOptions
  };

  async function getOne(sourceID) {
    const { body } = await got(`${opts.api}video/${sourceID}`, {
      json: true,
      query: {
        fields: opts.fields.join(',')
      }
    });

    // Private videos return their x-ID ("x8yd34t"), but can only be accessed
    // using their k-ID ("k7dtszqBcKiDg952dNz"). We'll override the returned
    // x-ID with the original sourceID, so k-IDs will stay k-IDs.
    return Object.assign(normalizeMedia(body), {
      sourceID
    });
  }

  async function get(sourceIDs) {
    // Private videos don't show up in the /videos endpoint. They will normally
    // only be added one at a time, though, because the search can only find one
    // at a time. The /video/{id} endpoint _does_ return private videos, so
    // we'll use that instead when we're requesting just one video. This should
    // work most of the time, at least.
    // A more robust way would be to attempt to hit the /video/{id} endpoints
    // for any videos that were not returned from the /videos request below 👇,
    // but I'm not sure that it's necessary. We can change it if it turns out to
    // be a problem.
    if (sourceIDs.length === 1) {
      return [await getOne(sourceIDs[0])];
    }

    const { body } = await got(`${opts.api}videos`, {
      json: true,
      query: {
        limit: sourceIDs.length,
        ids: sourceIDs.join(','),
        fields: opts.fields.join(',')
      }
    });

    const videos = {};
    body.list.forEach((video) => {
      videos[video.id] = normalizeMedia(video);
    });

    return sourceIDs.map(id => videos[id]);
  }

  async function search(query) {
    const id = getVideoID(query);
    if (id) {
      return [await getOne(id)];
    }

    const { body } = await got(`${opts.api}videos`, {
      json: true,
      query: {
        search: query,
        limit: 50,
        fields: opts.fields.join(',')
      }
    });
    return body.list.map(normalizeMedia);
  }

  return {
    get: get, // eslint-disable-line object-shorthand
    search
  };
}
