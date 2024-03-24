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


import GObject from 'gi://GObject';
import St from 'gi://St';

import Clutter from 'gi://Clutter';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';


const ENTER_KEYS = [
    Clutter.KEY_Return,
    Clutter.KEY_KP_Enter,
    Clutter.KEY_ISO_Enter,
    Clutter.KEY_RockerEnter,
    Clutter.KEY_3270_Enter,
];

let getFocusTimerID = null;


export default class SearchIndicator extends Extension {
    enable() {
        
        log(`[ Search Bar ] ENABLING`);
        
        this._settings = this.getSettings();
        this._indicator = new Indicator(this._settings, () => { this.openPreferences(); });

        Main.panel.addToStatusArea(this.uuid, this._indicator);
        this._indicator.addKeybinding(() => this._indicator.menu.toggle()); // or shell may lose binding on sleep etc
    }

    disable() {

        log(`[ Search Bar ] DISABLING`);

        this._indicator.removeKeybinding();
        this._indicator.destroy();
        this._indicator = null;
        this._settings = null;
        
        if (getFocusTimerID) {
            GLib.Source.remove(getFocusTimerID);
            getFocusTimerID = null;
        }
    }
};


const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {

    _init(settings, prefs) {
        super._init(0.0, 'Search Indicator');
        
        this._settings = settings;
        this._prefs = prefs;
        this._settings.connect("changed::open-search-bar-key", () => {
            log(`[ Search Bar ] rebind new keyboard shortcut`);
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
            this._prefs();
        });

        let entry = this.searchBar.clutter_text;
        entry.connect('key-press-event', this._onSearchKeyPress.bind(this));

        let popupSearch = new PopupMenu.PopupMenuSection();
        popupSearch.actor = this.searchBar;

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
            logError(e, `[ Search Bar ] [Error spawning command]: ${command}`);
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
})
