const {each, map, values, includes, intersection, dom} = require('../util');
const event = require('../core/event');
const format = require('../core/format');
const location = require('../core/location');
const resource = require('../core/resource');
const store = require('../core/store');
const allsettings = require('../core/settings');
const base = require('./base');
const pagination = require('./pagination');

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
            <ul id="items" class="clearfix">
                <li class="header">
                    <a class="icon"></a>
                    <a class="label" href="#"><span class="l10n-name"/></a>
                    <a class="date" href="#"><span class="l10n-lastModified"/></a>
                    <a class="size" href="#"><span class="l10n-size"/></a>
                </li>
            </ul>
            <div id="view-hint"></div>
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
let page_nav;
let displayItems;
let payload;

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
    displayItems = items;

    // Destroy previous buttons if they exist
    if (page_nav){
        page_nav.buttons.forEach(e => e.remove());
        delete page_nav.buttons;
        page_nav = undefined;
    }
    // each($view.find('.nav_buttons'), el => destroyNavBar(el));

    if (displayItems.length > pagination.getCachedPref()) {
        page_nav = new pagination.Pagination(displayItems, payload, module.exports);
        page_nav.sliceItems(1);
    } else {
        doSetItems(items);
    }
};

const doSetItems = items => {
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

const onLocationChanged = item => {
    if (!item) {
        item = location.getItem();
    }

    payload = item; // caching for reuse

    const items = filterPayload(item);

    setHint('empty');

    setItems(items);
};

const filterPayload = item => {
    const items = [];

    if (item.parent && !settings.hideParentFolder) {
        items.push(item.parent);
    }

    each(item.content, child => {
        if (!(child.isFolder() && settings.hideFolders)) {
            items.push(child);
        }
    });
    return items;
}

const onPaginationUpdated = (pref) => {
    if (!page_nav) {
        page_nav = new pagination.Pagination(displayItems, payload, module.exports);
        page_nav.rows_per_page = pref;
        page_nav.sliceItems(1);
        return;
    }
    page_nav.rows_per_page = pref;
    let count = page_nav.computeTotalPages();
    console.log(`count received: ${count}`);

    page = (page_nav.current_page <= page_nav.last_page) ? page_nav.current_page : page_nav.last_page;
    console.log(`Result page ${page}, because ${page_nav.current_page}/ ${page_nav.last_page}`);

    page_nav.sliceItems(page);
}

const onLocationRefreshed = (item, added, removed) => {
    console.log(`refresh items: ${item.length} added ${added} length ${added.length} removed ${removed} length ${removed.length}`);
    payload = item;
    if (added.length === 0 && removed.length === 0){
        return;
    }

    // Block if pagination is active
    console.log(`Refresh->items.len=${values(item.content).length}, pref: ${pagination.getCachedPref()}`);
    if (values(item.content).length > pagination.getCachedPref()) {
        if (!page_nav){
            page_nav = new pagination.Pagination(values(item.content), payload, module.exports);
            page_nav.sliceItems(1);
            return;
        }
        page_nav.item = payload;
        page_nav.items = filterPayload(item);
        if(page_nav.isActive()){
            console.log("page nav is active! slicing new items");
            page_nav.computeTotalPages();
            page = (page_nav.current_page <= page_nav.last_page) ? page_nav.current_page : page_nav.last_page;
            page_nav.sliceItems(page);
        } else {
            console.log("page_nav not active, but needed!");
            page_nav.computeTotalPages();
            page = (page_nav.current_page <= page_nav.last_page) ? page_nav.current_page : page_nav.last_page;
            page_nav.sliceItems(page);
        }
        return;
    } else {
        // FIXME needs improvement
        // We recreate the items and remove ourselves to leave the default logic do its thing
        if (page_nav){
            if (page_nav.isActive()){
                page_nav.items = values(item.content);
                page_nav.computeTotalPages();
                page_nav.sliceItems(1);
            }
            page_nav.buttons.forEach(e => e.remove());
            delete page_nav.buttons;
            page_nav = undefined;
        }
    }

    const add = [];

    each(added, child => {
        if (!(child.isFolder() && settings.hideFolders)) {
            add.push(child);
        }
    });

    setHint('empty');

    changeItems(add, removed);
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
    pagination.$el.appTo(base.$content);
    $hint.hide();

    format.setDefaultMetric(settings.binaryPrefix);

    event.sub('location.changed', onLocationChanged);
    event.sub('location.refreshed', onLocationRefreshed);
    event.sub('pagination.pref.changed', onPaginationUpdated)
    event.sub('resize', onResize);
    onResize();
};

init();

const getPag = () => {
    return page_nav;
}

module.exports = {
    $el: $view,
    getPag,
    setItems,
    doSetItems,
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
