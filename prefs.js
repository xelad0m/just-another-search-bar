/* prefs.js
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


import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';

import { 
    ExtensionPreferences, 
    gettext as _ 
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


export default class SearchPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window._settings = this.getSettings();
        const page = new MyNoodleCodedPrefPage(window._settings);
        window.add(page);
    }
};



const MyNoodleCodedPrefPage = GObject.registerClass(
class SearchPreferencesPage extends Adw.PreferencesPage {
    _init(settings) {
        super._init({
            title: _("Preferences"),
            icon_name: 'preferences-system-symbolic',
            name: 'GeneralPreferences'
        });
        this._settings = settings;


        
        // group 1 choose, add, remove, edit commands
        let searchEngineGroup = new Adw.PreferencesGroup({
            title: _('Search command'),
        });
        
        // Expander row
        this.chooseSearchCmdExpanderRow = new Adw.ExpanderRow({
            title: _('Default search'),
            subtitle: _('Choose, add, remove or edit entry'),
            show_enable_switch: false,
            enable_expansion: true,
        });
        this.chooseSearchCmdExpanderRow.connect("notify::expanded", this._updateCommandContent.bind(this));
        // +/- buttons
        let addEntry = new Gtk.Button({
            icon_name: 'list-add-symbolic',
            valign: Gtk.Align.CENTER
        });
        addEntry.connect('clicked', this._addEntry.bind(this));
        let removeEntry = new Gtk.Button({
            icon_name: 'list-remove-symbolic',
            valign: Gtk.Align.CENTER
        });
        removeEntry.connect('clicked', this._removeEntry.bind(this))
        // dropdown list
        this.currentSearchCmdMenu = new Gtk.DropDown({
            valign: Gtk.Align.CENTER,
            halign: Gtk.Align.FILL,
        });
        this._settings.connect('changed::command-templates', this._updateSearchCommandsList.bind(this));
        this._updateSearchCommandsList();
        this._settings.connect('changed::open-search-bar-key', () => {
            this.scLabel.set_accelerator(this._settings.get_strv('open-search-bar-key')[0]);
        });

        this.currentSearchCmdMenu.connect("notify::selected", (widget) => {
            this._settings.set_int('command-id', widget.selected);
            this._updateCommandContent();

            log(`[ Search Bar ] cmdId = ${widget.selected}`);
        });
        
        this.chooseSearchCmdExpanderRow.add_prefix(this.currentSearchCmdMenu);
        this.chooseSearchCmdExpanderRow.add_prefix(addEntry);
        this.chooseSearchCmdExpanderRow.add_prefix(removeEntry);
        
        // Expanded view
        // command name edit
        this.cmdNameEntry = new Gtk.Entry({
            placeholder_text: '',
            valign: Gtk.Align.CENTER,
        });
        let cmdNameEntryRow = new Adw.ActionRow({
            title: _('Name'),
            subtitle: _('This entry name. Edit and press save to create new entry'),
            activatable_widget: this.cmdNameEntry
        });
        this.cmdNameEntry.connect('notify::text', this._updateCommandExample.bind(this));
        cmdNameEntryRow.add_suffix(this.cmdNameEntry);
        
        // command line edit
        this.cmdTemplateEntry = new Gtk.Entry({
            placeholder_text: '',
            valign: Gtk.Align.CENTER,
        });
        let cmdTemplateEntryRow = new Adw.ActionRow({
            title: _('Command'),
            subtitle: _('Command line template with wildcarded query'),
            activatable_widget: this.cmdTemplateEntry
        });
        this.cmdTemplateEntry.connect('notify::text', this._updateCommandExample.bind(this));
        cmdTemplateEntryRow.add_suffix(this.cmdTemplateEntry);
        
        // command wildcard edit
        this.cmdWildcardEntry = new Gtk.Entry({
            placeholder_text: '',
            valign: Gtk.Align.CENTER,
            halign: Gtk.Align.FILL,
        });
        let cmdWildcardEntryRow = new Adw.ActionRow({
            title: _('Wildcard'),
            subtitle: _('Symbol used as wildcard for query in command line'),
            activatable_widget: this.cmdWildcardEntry
        });
        this.cmdWildcardEntry.connect('notify::text', this._updateCommandExample.bind(this));
        cmdWildcardEntryRow.add_suffix(this.cmdWildcardEntry);
        
        // command delimiter edit
        this.cmdDelimEntry = new Gtk.Entry({
            placeholder_text: '',
            valign: Gtk.Align.CENTER,
        });
        let cmdDelimEntryRow = new Adw.ActionRow({
            title: _('Query delimiter'),
            subtitle: _('Symbol to use as delimiter for query tokens'),
            activatable_widget: this.cmdDelimEntry
        });
        this.cmdDelimEntry.connect('notify::text', this._updateCommandExample.bind(this));
        cmdDelimEntryRow.add_suffix(this.cmdDelimEntry);
        
        // command example query edit
        this.cmdQueryEntry = new Gtk.Entry({
            text: _("test query"),
            valign: Gtk.Align.CENTER,
        });
        let cmdQueryEntryRow = new Adw.ActionRow({
            title: _('Example query'),
            activatable_widget: this.cmdQueryEntry
        });
        this.cmdQueryEntry.connect('notify::text', this._updateCommandExample.bind(this));
        cmdQueryEntryRow.add_suffix(this.cmdQueryEntry);
        
        // render example row
        this.renderExampleLabel = new Gtk.Label({
            valign: Gtk.Align.CENTER,
        });
        let cmdRenderRow = new Adw.ActionRow({
            title: _('Result command line:'),
        });
        cmdRenderRow.add_suffix(this.renderExampleLabel);
        
        // save button
        let saveEntry = new Gtk.Button({
            icon_name: 'document-save-symbolic',
            valign: Gtk.Align.CENTER
        });
        saveEntry.connect('clicked', this._saveEntry.bind(this))
        let buttonRow = new Adw.ActionRow({
            title: _('Save'),
        });
        buttonRow.add_suffix(saveEntry);
        
        this.chooseSearchCmdExpanderRow.add_row(cmdNameEntryRow);
        this.chooseSearchCmdExpanderRow.add_row(cmdTemplateEntryRow);
        this.chooseSearchCmdExpanderRow.add_row(cmdWildcardEntryRow);
        this.chooseSearchCmdExpanderRow.add_row(cmdDelimEntryRow);
        this.chooseSearchCmdExpanderRow.add_row(cmdQueryEntryRow);
        this.chooseSearchCmdExpanderRow.add_row(cmdRenderRow);
        this.chooseSearchCmdExpanderRow.add_row(buttonRow);
        searchEngineGroup.add(this.chooseSearchCmdExpanderRow);
        
        
        
        // group 2 keyboard
        this.scLabel = new Gtk.ShortcutLabel({
            accelerator: this._settings.get_strv('open-search-bar-key')[0],
            disabled_text: _('...new keyboard shortcut...'),
            valign: Gtk.Align.CENTER,
            halign: Gtk.Align.FILL,
        })
        this.keyboardButton = new Gtk.Button({
            icon_name: 'preferences-desktop-keyboard-shortcuts-symbolic',
            valign: Gtk.Align.CENTER
        });
        this.keyboardButton.connect('clicked', this._keyboardGetBinding.bind(this));
        let keyboardGroup = new Adw.PreferencesGroup({
            title: _('Search bar activation'),
        });
        let keyboardRow = new Adw.ActionRow({
            title: _("Keyboard shortcut"),
            subtitle: _("Press button to enter new keyboard shortcut"),
        });
        keyboardRow.add_prefix(this.keyboardButton);
        keyboardRow.add_suffix(this.scLabel);
        keyboardGroup.add(keyboardRow);
        

        
        // group 3 reset
        let resetGroup = new Adw.PreferencesGroup({
            title: _('Reset defaults'),
        });
        
        let resetButton = new Gtk.Button({
            icon_name: 'edit-undo-symbolic',
            valign: Gtk.Align.CENTER
        });
        resetButton.connect('clicked', this._resetDefaults.bind(this))
        let resetRow = new Adw.ActionRow({
            title: _("Reset"),
            subtitle: _("Reset all settings to defaults, drop all new entries"),
        });
        resetRow.add_suffix(resetButton);
        resetGroup.add(resetRow);

        this.add(searchEngineGroup);
        this.add(keyboardGroup);
        this.add(resetGroup);
    }
    
    // ON changed::command-templates
    // read cmd names list to dropdown menu
    _updateSearchCommandsList() {
        let currentSearchList = new Gtk.StringList();   // must be subclass of GObject
        let currentCmdNames = this._settings.get_strv('command-names');
        currentCmdNames.forEach((name) => currentSearchList.append(name));
        this.currentSearchCmdMenu.model = currentSearchList;
        this.currentSearchCmdMenu.set_selected(this._settings.get_int('command-id')); 
        
        log(`[ Search Bar ] Search commands list updated`);
    }

    // ON notify::expanded notify::selected
    // read current selected cmd params to entries
    _updateCommandContent() {
        let cmdId = this._settings.get_int('command-id');
        let name= this._settings.get_strv('command-names')[cmdId];
        let template= this._settings.get_strv('command-templates')[cmdId];
        let wildcard = this._settings.get_strv('command-wildcards')[cmdId];
        let delimiter = this._settings.get_strv('command-delimiters')[cmdId];
        
        this.cmdNameEntry.text = String(name);
        this.cmdTemplateEntry.text = String(template);
        this.cmdWildcardEntry.text = String(wildcard);
        this.cmdDelimEntry.text = String(delimiter);

        let query = String(this.cmdQueryEntry.text);
        let command = this._compileCommand(template, wildcard, delimiter, query);
        this.renderExampleLabel.set_label(String(command));
    }

    // ON notify::text from any Entry
    _updateCommandExample() {
        let template = this.cmdTemplateEntry.text;
        let wildcard = this.cmdWildcardEntry.text;
        let delimiter = this.cmdDelimEntry.text;
        let query = this.cmdQueryEntry.text;
        let command = this._compileCommand(template, wildcard, delimiter, query);
        this.renderExampleLabel.set_label(command);
    }

    _addEntry() {
        this.chooseSearchCmdExpanderRow.expanded = true;
        this.cmdNameEntry.text = this.cmdTemplateEntry.text = this.cmdWildcardEntry.text = this.cmdDelimEntry.text = '';
        log(`[ Search Bar ] add button pressed`);
    }

    _removeEntry() {
        let cmdId = this._settings.get_int('command-id');
        let names= this._settings.get_strv('command-names');
        let templates = this._settings.get_strv('command-templates');
        let wildcards = this._settings.get_strv('command-wildcards');
        let delimiters = this._settings.get_strv('command-delimiters');
        
        if (names.length == 1) { 
            return
        }
        
        let switchTo = (cmdId == 0) ? cmdId : cmdId - 1;
        
        names.splice(cmdId, 1);
        templates.splice(cmdId, 1);
        wildcards.splice(cmdId, 1);
        delimiters.splice(cmdId, 1);
        
        this._settings.set_strv('command-names', names);
        this._settings.set_strv('command-templates', templates);
        this._settings.set_strv('command-wildcards', wildcards);
        this._settings.set_strv('command-delimiters', delimiters);
        this._settings.set_int('command-id', switchTo);
        
        this.currentSearchCmdMenu.set_selected(this._settings.get_int('command-id'));
        
        log(`[ Search Bar ] remove button pressed: removing ${cmdId}, switch to ${switchTo}`);
    }

    _saveEntry() {
        let names= this._settings.get_strv('command-names');
        let templates = this._settings.get_strv('command-templates');
        let wildcards = this._settings.get_strv('command-wildcards');
        let delimiters = this._settings.get_strv('command-delimiters');

        let nameCmd = String(this.cmdNameEntry.text);
        let template = String(this.cmdTemplateEntry.text);
        let wildcard = String(this.cmdWildcardEntry.text);
        let delimiter = String(this.cmdDelimEntry.text);
        
        if (names.includes(nameCmd)) {
            let idx = names.indexOf(nameCmd);
            names[idx] = nameCmd;
            templates[idx] = template;
            wildcards[idx] = wildcard;
            delimiters[idx] = delimiter;
        } else {
            names.push(nameCmd);
            templates.push(template);
            wildcards.push(wildcard);
            delimiters.push(delimiter);
        }
        
        this._settings.set_strv('command-names', names);
        this._settings.set_strv('command-templates', templates);
        this._settings.set_strv('command-wildcards', wildcards);
        this._settings.set_strv('command-delimiters', delimiters);
        this._settings.set_int('command-id', names.indexOf(nameCmd));

        this.currentSearchCmdMenu.set_selected(this._settings.get_int('command-id')); 

        log(`[ Search Bar ] save button pressed: switch to ${names.indexOf(nameCmd)}`);
    }

    _compileCommand(template, wildcard, delimiter, query) {
        query = String(query).trim().replace(/ /g, String(delimiter));
        return (wildcard != '') ? String(template).replace(String(wildcard), query) 
                                : String(template) + ' ' + query;
    }

    _keyboardGetBinding() {
        this.scLabel.set_accelerator('');
    
        let evck = new Gtk.EventControllerKey();
        this.add_controller(evck);

        let pressed = 0; let released = 0;
        let binding;

        evck.connect('key-pressed', (widget, keyval, keycode, state) => {
            pressed++;
            let mask = state & Gtk.accelerator_get_default_mod_mask();
            binding = Gtk.accelerator_name_with_keycode(
                null, keyval, keycode, mask);
            this.scLabel.set_accelerator(binding);
            return Gdk.EVENT_STOP;
        });

        evck.connect('key-released', () => {
            if ((pressed == ++released)) {
                this.remove_controller(evck);
                log(`[ Search Bar ] Binding is: ${binding}`);
                this._settings.set_strv('open-search-bar-key', [binding]);
            }
            return Gdk.EVENT_STOP;
        });
    }

    _resetDefaults() {
        this._settings.reset('command-id');
        this._settings.reset('command-names');
        this._settings.reset('command-templates');
        this._settings.reset('command-wildcards');
        this._settings.reset('command-delimiters');
        this._settings.reset('open-search-bar-key');

        this._updateSearchCommandsList();
        this.chooseSearchCmdExpanderRow.expanded = false;
    }
});
