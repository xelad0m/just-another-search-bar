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

const Gettext = imports.gettext;
const Domain = Gettext.domain(Me.metadata.uuid);
const _ = Domain.gettext;

const ENTER_KEYS = [
    Clutter.KEY_Return,
    Clutter.KEY_KP_Enter,
    Clutter.KEY_ISO_Enter,
    Clutter.KEY_RockerEnter,
    Clutter.KEY_3270_Enter,
];

let getFocusTimerID = null;

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {

    _init() {
        super._init(St.Align.MIDDLE, 'Search Indicator');

        this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.just-another-search-bar');
        this._settings.connect("changed::open-search-bar-key", () => {
            log(`[${Me.uuid}] rebind new keyboard shortcut`);
            this.removeKeybinding();
            this.addKeybinding(() => this.menu.toggle());
        });

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
            ExtensionUtils.openPrefs()
        });

        let entry = this.searchBar.clutter_text;
        entry.connect('key-press-event', this._onSearchKeyPress.bind(this));

        let popupSearch = new PopupMenu.PopupMenuSection();
        popupSearch.actor.add_actor(this.searchBar);

        this.menu.addMenuItem(popupSearch);
        this.menu.actor.add_style_class_name('search-bar-menu');

        this.menu.connect('open-state-changed', this._focus.bind(this));
        
        this.addKeybinding(() => this.menu.toggle());
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

    _compileCommand(template, wildcard, delimiter, query) {
        query = String(query).trim().replace(/ /g, String(delimiter));
        return (wildcard != '') ? String(template).replace(String(wildcard), query) 
                                : String(template) + ' ' + query;
    }

    _goSearch (query) {
        let cmdId = this._settings.get_int('command-id');
        let cmdName = this._settings.get_strv('command-names')[cmdId];
        let template = this._settings.get_strv('command-templates')[cmdId];
        let wildcard = this._settings.get_strv('command-wildcards')[cmdId];
        let delimiter = this._settings.get_strv('command-delimiters')[cmdId];

        let command = this._compileCommand(template, wildcard, delimiter, query);
        try {
            GLib.spawn_command_line_async(command);
        } catch (e) {
            logError(e, `[${Me.uuid}] [Error spawning command]: ${command}`);
            Main.notify(_("Can't open ") + `${cmdName}`);
            throw e
        }
    }

    _focus (menu, open) {
        if (open) {
            getFocusTimerID = setTimeout(() => { 
                global.stage.set_key_focus(this.searchBar);
                getFocusTimerID = null;
            }, 100);
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
        this._indicator.addKeybinding(() => this._indicator.menu.toggle()); // or shell may lose binding on sleep etc
    }

    disable() {
        this._indicator.removeKeybinding();
        this._indicator.destroy();
        this._indicator = null;
        
        if (getFocusTimerID) {
            GLib.Source.remove(getFocusTimerID);
            getFocusTimerID = null;
        }
    }
}

function init() {
    ExtensionUtils.initTranslations(Me.metadata.uuid);
    return new Extension();
}
