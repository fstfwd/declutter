# declutter
A small JavaScript library that removes clutter from HTML.

The core algorithm is based on the original Arc90's [Readability](https://code.google.com/p/arc90labs-readability/) project, but significantly improved.

I built this library while adding web clipping support to [Quiver: The Programmer's Notebook](http://happenapps.com/#quiver).

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

This plot compares four libraries: [Arc90](https://code.google.com/p/arc90labs-readability/), [node-readability](https://github.com/luin/readability), [Mozilla Readability](https://github.com/mozilla/readability) and declutter. Benchmark data came from Mozilla Readabillity, and consists of several real-world webpages pulled from Lifehacker, Medium, Salon, etc.

The x-axis stands for op/s, so the longer the better. You can see that "declutter.js" performs 2x to 10x better than other libraries.

![Benchmark](https://raw.githubusercontent.com/ylian/declutter/master/benchmark/result.png)

## License

Released under the MIT license.