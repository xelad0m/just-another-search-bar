/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* Based on Google Search (https://extensions.gnome.org/extension/1057/google-search/) */

/* exported init */

const { GObject, St, Clutter, Meta, Shell, GLib } = imports.gi;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ExtManager = Main.extensionManager;           // open preferences
const ExtensionUtils = imports.misc.extensionUtils; // settings, translations

const Me = ExtensionUtils.getCurrentExtension();

const ENTER_KEYS = [
    Clutter.KEY_Return,
    Clutter.KEY_KP_Enter,
    Clutter.KEY_ISO_Enter,
    Clutter.KEY_RockerEnter,
    Clutter.KEY_3270_Enter,
];

class Command {
    constructor (template, wildcard, delimiter) {
        this.template = template;
        this.wildcard = wildcard;
        this.delimiter = delimiter;
    }
    compile(query) {
        query = query.trim().replace(/ /g, this.delimiter);
        return this.template.replace(this.wildcard, query);
    }
}

const CMD_NAMES = [
    'google', 
    'yandex', 
    'baidu', 
    'recoll',
]

const COMMANDS = [
    new Command('xdg-open https://www.google.com/search?q=#', '#', '+'),
    new Command('xdg-open https://yandex.ru/search/?text=#', '#', '+'),
    new Command('xdg-open https://www.baidu.com/s?wd=#', '#', '%20'),
    new Command('recoll -q #', '#', ' '),
]

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
    _init() {
        super._init(St.Align.MIDDLE, 'Search Indicator');
        this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.just-another-search-bar');
        this._settings.connect("changed", () => {
            log(`[${Me.uuid}] REBIND new keyboard shortcut`);
            this.removeKeybinding();
            this.addKeybinding(() => this.menu.open());
        });

        // let arr = this._settings.get_strv("open-search-bar-key");
        // log(`[${Me.uuid}]:`, ...arr, arr.length, arr[0], typeof arr[0]);
        // arr[0] = '<Control><Alt>g';
        // this._settings.set_strv("open-search-bar-key", arr);
        // arr = this._settings.get_strv("open-search-bar-key");
        // log(`[${Me.uuid}]:`, ...arr, arr.length, arr[0], typeof arr[0]);

        this.add_child(new St.Icon({
            icon_name: 'edit-find-symbolic',
            style_class: 'system-status-icon',
        }));
        
        this.searchBar = new St.Entry({
            hint_text: '',
            style_class: 'search-bar',
        });

        this.searchBar.set_primary_icon(new St.Icon({
            icon_name: 'go-next-symbolic',
            style_class: 'popup-menu-icon',
        }));

        this.searchBar.set_secondary_icon(new St.Icon({
            icon_name: 'emblem-system-symbolic',
            style_class: 'popup-menu-icon',
        }));
        
        this.searchBar.connect('primary-icon-clicked', this._onSearchIcoClick.bind(this));
        this.searchBar.connect('secondary-icon-clicked', () => { 
            this.menu.close();
            ExtManager.openExtensionPrefs(Me.uuid, '', {});
        });

        let entry = this.searchBar.clutter_text;
        entry.connect('key-press-event', this._onSearchKeyPress.bind(this));

        let popupSearch = new PopupMenu.PopupMenuSection();
        popupSearch.actor.add_actor(this.searchBar);

        this.menu.addMenuItem(popupSearch);
        this.menu.actor.add_style_class_name('search-bar-menu');

        this.menu.connect('open-state-changed', this._focus.bind(this));
        
        this.addKeybinding(() => this.menu.open());
    }

    _onSearchIcoClick(actor, event) {
        let query = this.searchBar.get_text();
        if (query.length > 0) {
            this._goSearch(query);
            this.searchBar.set_text('');
            this.menu.close();
        }
        return Clutter.EVENT_PROPAGATE;
    }

    _onSearchKeyPress(actor, event) {
        let symbol = event.get_key_symbol();
        let query = this.searchBar.get_text();
        if (ENTER_KEYS.includes(symbol) && query.length > 0) {    
            this._goSearch(query);
            this.searchBar.set_text('');
            this.menu.close();
        }
        return Clutter.EVENT_PROPAGATE;
    }

    _goSearch (query) {
        let commandId = this._settings.get_enum('command-name').toString();

        let command = COMMANDS[commandId].compile(query);

        try {
            GLib.spawn_command_line_async(command);
        } catch (e) {
            logError(e, `[Error spawning command]: ${command}`);
            Main.notify(`Can't open ${CMD_NAMES[commandId]}`);
            throw e
        }
    }

    _focus (menu, open) {
        if (open) {
            setTimeout(() => global.stage.set_key_focus(this.searchBar), 100);
        }
    }

    addKeybinding(handler) {
        Main.wm.addKeybinding(
            "open-search-bar-key",
            this._settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.ALL,
            handler);
    }

    removeKeybinding() {
        Main.wm.removeKeybinding("open-search-bar-key");
    }
});

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
    }

    enable() {
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
