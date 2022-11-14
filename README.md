# Just Another Search Bar
![screenshot](./img/screenshot.png)

Simple GNOME Shell extension just to search from desktop with google/yandex/baidu or with [recoll](https://www.lesbonscomptes.com/recoll/pages/index-recoll.html) full-text desktop search.

To **open** click on the search icon on the menu bar or press `Ctrl+Alt+F`

## Install

- Install: 
    
    ```
    git clone https://github.com/xelad0m/just-another-search-bar & cd just-another-search-bar
    make install
    ```

- Remove:

    ```
    make remove
    ```

## Details

If you want to **change keyboard shortcut** just type in terminal this command with desirable shortcut:

    dconf write /org/gnome/shell/extensions/just-another-search-bar/open-search-bar-key "['<Control><Alt>f']"

## About

Tested on GNOME 43

Based on [Google Search](https://extensions.gnome.org/extension/1057/google-search/) by [defcat](https://extensions.gnome.org/accounts/profile/defcat)