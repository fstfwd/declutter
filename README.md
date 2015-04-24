# declutter
A small JavaScript library that removes clutter from HTML.

The core algorithm is based on the original Arc90's [Readability](https://code.google.com/p/arc90labs-readability/) project.

## Design

Designed for web clipping. So no support for fetching next page links, Readability UI, or footnotes.

## Features

* A DOM to DOM converter.
* Unobtrusive. The original DOM is kept intact.
* Handles HTML5 tags such as `<article>` and `<section>`.
* Blazingly fast. Even on mobile devices.

## Run Tests

Make sure you have `mocha` installed. Then:

```bash
$ cd uncluttered/
$ npm install --dev
$ mocha
```

Test data came from [Mozilla Readability](https://github.com/mozilla/readability).

## Benchmark

```bash
$ matcha
```

![Benchmark](https://raw.githubusercontent.com/ylian/declutter/master/benchmark/result.png)

## License

Released under the MIT license.