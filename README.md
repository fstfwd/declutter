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

## Usage

Declutter can run both in the browser and on Node.js.

Method signature:

```
var el = declutter(el, document);
```

You can pass in any DOM element. It doesn't have to be the full page.

In the browser:

```html
<script src="declutter.js"></script>
```

```javascript
var el = declutter(document.body, document);
console.log(el.innerHTML);
```

On Node.js:

```javascript
var jsdom = require("jsdom").jsdom;
var doc = jsdom(html);
var el = declutter(doc.documentElement, doc);
console.log(el.innerHTML);
```

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

For a fair comparison, all libraries use JSDOM as the DOM implementation. JSDOM is quite slow, so if you care about the absolute speed (op/s), you should switch to a faster DOM implementation such as Cheerio.

![Benchmark](https://raw.githubusercontent.com/ylian/declutter/master/benchmark/result.png)

The x-axis stands for op/s, so the longer the better. You can see that "declutter.js" performs 2x to 10x better than other libraries.

## License

Released under the MIT license.