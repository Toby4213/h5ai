const {each, map, includes, intersection, dom} = require('../util');
const event = require('../core/event');
const format = require('../core/format');
const location = require('../core/location');
const resource = require('../core/resource');
const store = require('../core/store');
const allsettings = require('../core/settings');
const base = require('./base');
// const item = require('../model/item');

const modes = ['details', 'grid', 'icons'];
const sizes = [20, 40, 60, 80, 100, 150, 200, 250, 300, 350, 400];
const settings = Object.assign({
    binaryPrefix: false,
    hideFolders: false,
    hideParentFolder: false,
    maxIconSize: 40,
    modes,
    setParentFolderLabels: false,
    sizes
}, allsettings.view);
const sortedSizes = settings.sizes.sort((a, b) => a - b);
const checkedModes = intersection(settings.modes, modes);
const storekey = 'view';
const viewTpl =
        `<div id="view">
            <div id="pagination_top" class="nav_buttons"></div>
            <ul id="items" class="clearfix">
                <li class="header">
                    <a class="icon"></a>
                    <a class="label" href="#"><span class="l10n-name"/></a>
                    <a class="date" href="#"><span class="l10n-lastModified"/></a>
                    <a class="size" href="#"><span class="l10n-size"/></a>
                </li>
            </ul>
            <div id="view-hint"></div>
            <div id="pagination_btm" class="nav_buttons"></div>
        </div>`;
const itemTpl =
        `<li class="item">
            <a>
                <span class="icon square"><img/></span>
                <span class="icon landscape"><img/></span>
                <span class="label"></span>
                <span class="date"></span>
                <span class="size"></span>
            </a>
        </li>`;
const $view = dom(viewTpl);
const $items = $view.find('#items');
const $hint = $view.find('#view-hint');
const $pagination_els = $view.find('.nav_buttons');
const btn_cls = [['btn_first', '<<'], ['btn_prev', '<'], ['btn_next', '>'], ['btn_last', '>>']];
var page_nav = {};

const cropSize = (size, min, max) => Math.min(max, Math.max(min, size));

const createStyles = size => {
    const dsize = cropSize(size, 20, 80);
    const gsize = cropSize(size, 40, 160);
    const isize = cropSize(size, 80, 1000);
    const ilsize = Math.round(isize * 4 / 3);
    const important = '!important;';
    const detailsPrefix = `#view.view-details.view-size-${size}`;
    const gridPrefix = `#view.view-grid.view-size-${size}`;
    const iconsPrefix = `#view.view-icons.view-size-${size}`;
    const rules = [
        `${detailsPrefix} .item .label {line-height: ${dsize + 14}px ${important}}`,
        `${detailsPrefix} .item .date {line-height: ${dsize + 14}px ${important}}`,
        `${detailsPrefix} .item .size {line-height: ${dsize + 14}px ${important}}`,
        `${detailsPrefix} .square {width: ${dsize}px ${important} height: ${dsize}px ${important}}`,
        `${detailsPrefix} .square img {width: ${dsize}px ${important} height: ${dsize}px ${important}}`,
        `${detailsPrefix} .label {margin-left: ${dsize + 32}px ${important}}`,

        `${gridPrefix} .item .label {line-height: ${gsize}px ${important}}`,
        `${gridPrefix} .square {width: ${gsize}px ${important} height: ${gsize}px ${important}}`,
        `${gridPrefix} .square img {width: ${gsize}px ${important} height: ${gsize}px ${important}}`,

        `${iconsPrefix} .item {width: ${ilsize}px ${important}}`,
        `${iconsPrefix} .landscape {width: ${ilsize}px ${important} height: ${isize}px ${important}}`,
        `${iconsPrefix} .landscape img {width: ${isize}px ${important} height: ${isize}px ${important}}`,
        `${iconsPrefix} .landscape .thumb {width: ${ilsize}px ${important}}`
    ];

    return rules.join('\n');
};

const addCssStyles = () => {
    const styles = map(sortedSizes, size => createStyles(size));
    styles.push(`#view .icon img {max-width: ${settings.maxIconSize}px; max-height: ${settings.maxIconSize}px;}`);
    dom('<style></style>').text(styles.join('\n')).appTo('head');
};

const set = (mode, size) => {
    const stored = store.get(storekey);

    mode = mode || stored && stored.mode;
    size = size || stored && stored.size;
    mode = includes(settings.modes, mode) ? mode : settings.modes[0];
    size = includes(settings.sizes, size) ? size : settings.sizes[0];
    store.put(storekey, {mode, size});

    each(checkedModes, m => {
        if (m === mode) {
            $view.addCls('view-' + m);
        } else {
            $view.rmCls('view-' + m);
        }
    });

    each(sortedSizes, s => {
        if (s === size) {
            $view.addCls('view-size-' + s);
        } else {
            $view.rmCls('view-size-' + s);
        }
    });

    event.pub('view.mode.changed', mode, size);
};

const getModes = () => checkedModes;
const getMode = () => store.get(storekey).mode;
const setMode = mode => set(mode, null);

const getSizes = () => sortedSizes;
const getSize = () => store.get(storekey).size;
const setSize = size => set(null, size);

const onMouseenter = ev => {
    const item = ev.target._item;
    event.pub('item.mouseenter', item);
};

const onMouseleave = ev => {
    const item = ev.target._item;
    event.pub('item.mouseleave', item);
};

const createHtml = item => {
    const $html = dom(itemTpl);
    const $a = $html.find('a');
    const $iconImg = $html.find('.icon img');
    const $label = $html.find('.label');
    const $date = $html.find('.date');
    const $size = $html.find('.size');

    $html
        .addCls(item.isFolder() ? 'folder' : 'file')
        .on('mouseenter', onMouseenter)
        .on('mouseleave', onMouseleave);

    location.setLink($a, item);

    $label.text(item.label).attr('title', item.label);
    $date.attr('data-time', item.time).text(format.formatDate(item.time));
    $size.attr('data-bytes', item.size).text(format.formatSize(item.size));
    item.icon = resource.icon(item.type);

    if (item.isFolder() && !item.isManaged) {
        $html.addCls('page');
        item.icon = resource.icon('folder-page');
    }

    if (item.isCurrentParentFolder()) {
        item.icon = resource.icon('folder-parent');
        if (!settings.setParentFolderLabels) {
            $label.addCls('l10n-parentDirectory');
        }
        $html.addCls('folder-parent');
    }
    $iconImg.attr('src', item.icon).attr('alt', item.type);

    item.$view = $html;
    $html[0]._item = item;

    return $html;
};

const checkHint = () => {
    const hasNoItems = $items.find('.item').length === $items.find('.folder-parent').length;

    if (hasNoItems) {
        $hint.show();
    } else {
        $hint.hide();
    }
};

const setItems = items => {
    const removed = map($items.find('.item'), el => el._item);

    $items.find('.item').rm();

    each(items, item => $items.app(createHtml(item)));

    base.$content[0].scrollLeft = 0;
    base.$content[0].scrollTop = 0;
    checkHint();
    event.pub('view.changed', items, removed);
};

const changeItems = (add, remove) => {
    each(add, item => {
        createHtml(item).hide().appTo($items).show();
    });

    each(remove, item => {
        item.$view.hide().rm();
    });

    checkHint();
    event.pub('view.changed', add, remove);
};

const setHint = l10nKey => {
    $hint.rmCls().addCls('l10n-' + l10nKey);
    checkHint();
};

const rows_per_page = 5;

const onLocationChanged = item => {
    if (!item) {
        item = location.getItem();
    }

    const items = [];

    if (item.parent && !settings.hideParentFolder) {
        items.push(item.parent);
    }

    each(item.content, child => {
        if (!(child.isFolder() && settings.hideFolders)) {
            items.push(child);
        }
    });

    setHint('empty');

    // Destroy previous buttons if they exist
    if (page_nav.buttons) page_nav.buttons.forEach(e => e.remove());
    // each($view.find('.nav_buttons'), el => destroyNavBar(el));

    if (items.length > rows_per_page) {
        let page_count = Math.ceil(items.length / rows_per_page);
        page_nav = { 
            current_page: 1, 
            page_count: page_count,
            buttons: [],
        };
        setupPagination(items, $pagination_els, page_nav);
        displayItems(items, rows_per_page, page_nav.current_page);
    } else {
        setItems(items);
    }
};

const displayItems = (items, rows_per_page, page) => {
    page--;
    let start = rows_per_page * page;
    let end = start + rows_per_page;
    let paginatedItems = items.slice(start, end);

    setItems(paginatedItems);
};

const onLocationRefreshed = (item, added, removed) => {
    const add = [];

    each(added, child => {
        if (!(child.isFolder() && settings.hideFolders)) {
            add.push(child);
        }
    });

    setHint('empty');
    changeItems(add, removed);
};

const setupPagination = (items, wrapper, page_nav) => {
    each(wrapper, key => {
        key.innerHTML = "";
    });

    for (let i = 0; i < btn_cls.length; i++) {
        each(wrapper, key => {
            btn = paginationButton(btn_cls[i], items, page_nav);
            key.appendChild(btn);
            page_nav.buttons.push(btn);
        });
    }

    each(wrapper, key => {
        div = updatePageStatus(null, page_nav);
        key.insertBefore(div, key.childNodes[2]);
        page_nav.buttons.push(div);
    });
};

const paginationButton = (cls, items, page_nav) => {
	let button = document.createElement('button');
    button.innerText = cls[1];

    _class = cls[0];
    button.classList.add(_class);

    let target = () => 1;
    button.disabled = false;
    switch (_class) {
        case 'btn_prev':
            target = () => page_nav.current_page - 1;
            button.disabled = true;
            break;
        case 'btn_next':
            target = () => page_nav.current_page + 1;
            break;
        case 'btn_last':
            target = () => page_nav.page_count;
            break;
        default:
            button.disabled = true;
    }
    button._mycallback = target;

	button.addEventListener('click', () => {
        target_page = button._mycallback();
        console.log("DEBUG target()", target_page, this);
        displayItems(items, rows_per_page, target_page);
        page_nav.current_page = target_page;
        
        if (page_nav.page_count === 2) {
            return;
        }
        let prev_buttons =  document.querySelectorAll('.btn_first, .btn_prev');
        let next_buttons =  document.querySelectorAll('.btn_next, .btn_last');
        if (page_nav.current_page <= 1) {
            each(prev_buttons, button => button.disabled = true);
            each(next_buttons, button => button.disabled = false);
        } else if (page_nav.current_page >= page_nav.page_count && page_nav.current_page > 1) {
            each(next_buttons, button => button.disabled = true);
            each(prev_buttons, button => button.disabled = false);
        } else {
            let nav_buttons = document.querySelectorAll('.btn_first, .btn_prev, .btn_next, .btn_last');
            each(nav_buttons, button => button.disabled = false);
        }
        let page_pos = document.querySelectorAll('.page_pos');
        each(page_pos, el => updatePageStatus(el, page_nav));
	});
	return button;
};

const updatePageStatus = (div, page_nav) => {
    _str = page_nav.current_page.toString().concat('/', page_nav.page_count.toString());
    if (!div) {
        div = document.createElement('div');
        div.appendChild(document.createTextNode(_str));
        div.classList.add('page_pos');
        return div;
    }
    return div.innerText = _str;
};

const destroyNavBar = (el) => {
    // page_nav.buttons.forEach(el => {
    //     // el.removeEventListener()
    //     // delete el;
    // });
    console.log("destroying el:", el);
    el.innerHTML = "";
    // each(el.childNodes, e => {
    //     if (e !== undefined) e.remove();
    // });
};

const onResize = () => {
    const width = $view[0].offsetWidth;

    $view.rmCls('width-0').rmCls('width-1');
    if (width < 320) {
        $view.addCls('width-0');
    } else if (width < 480) {
        $view.addCls('width-1');
    }
};

const init = () => {
    addCssStyles();
    set();

    $view.appTo(base.$content);
    $hint.hide();

    format.setDefaultMetric(settings.binaryPrefix);

    event.sub('location.changed', onLocationChanged);
    event.sub('location.refreshed', onLocationRefreshed);
    event.sub('resize', onResize);
    onResize();
};

init();

module.exports = {
    $el: $view,
    setItems,
    changeItems,
    setLocation: onLocationChanged,
    setHint,
    getModes,
    getMode,
    setMode,
    getSizes,
    getSize,
    setSize
};
