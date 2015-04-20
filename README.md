# declutter
Remove clutter from HTML.

The core algorithm is based on the original Arc90's [Readability](https://code.google.com/p/arc90labs-readability/) project.

## Design

Designed for web clipping. So no support for fetching next page links, Readability UI, or footnotes. And it only works in the browser.

## Features

* A DOM to DOM converter.
* Unobtrusive. The original DOM is kept intact.
* Focus on speed and accuracy. It should be fast even on mobile devices.

## License

Released under the MIT license.