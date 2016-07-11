üWave Dailymotion Media Source
==============================

A üWave media source for searching through videos from [Dailymotion].

## Installation

```
npm install --save u-wave-source-dailymotion
```

## Usage

```js
import uwave from 'u-wave-core';
import dailymotionSource from 'u-wave-source-dailymotion';

const uw = uwave({ /* your config */ });

uw.source('dailymotion', dailymotionSource);
```

## License

[MIT]

[Dailymotion]: https://dailymotion.com
[MIT]: ./LICENSE
