var el = declutter(document.body, document);

var lightbox = document.createElement('DIV');
lightbox.style.position = 'fixed';
lightbox.style.top = 0;
lightbox.style.left = 0;
lightbox.style.bottom = 0;
lightbox.style.right = 0;
lightbox.style.zIndex = 9000000090;
lightbox.style.backgroundColor = 'white';

var reader = document.createElement('DIV');
reader.style.width = '660px';
reader.style.height = '100%';
reader.style.margin = '0 auto';
reader.style.fontSize = '15px';
reader.style.fontFamily = 'Georgia';
reader.style.lineHeight = 1.5;
reader.style.overflow = 'auto';
reader.appendChild(el);

lightbox.appendChild(reader);
document.body.appendChild(lightbox);
