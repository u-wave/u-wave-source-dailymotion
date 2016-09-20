import got from 'got';
import getArtistTitle, { fallBackToArtist } from 'get-artist-title';

function normalizeMedia(media) {
  const [artist, title] = getArtistTitle(media.title, [
    'base',
    fallBackToArtist(media.soundtrack_artist || media['owner.username'])
  ]);

  return {
    sourceID: media.id,
    artist, title,
    duration: media.duration,
    thumbnail: media.thumbnail_360_url,
    restricted: []
  };
}

export function getVideoId(url) {
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

    return normalizeMedia(body);
  }

  async function get(sourceIDs) {
    const { body } = await got(`${opts.api}videos`, {
      json: true,
      query: {
        limit: sourceIDs.length,
        ids: sourceIDs.join(','),
        fields: opts.fields.join(',')
      }
    });

    const videos = {};
    for (const video of body.list) {
      videos[video.id] = normalizeMedia(video);
    }

    return sourceIDs.map(id => videos[id]);
  }

  async function search(query, page = {}) {
    const id = getVideoId(query);
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
