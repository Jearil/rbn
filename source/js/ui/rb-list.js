$(function() {

  RBN.UI.RBList = RBN.UI.List.extend(function (base) {

    var options = {
      template: _.template($('#list-item-template').html()),
    };

    var GHOST_PERSON_IMG = 'ghost_person.png';

    return {
      init: function () {
        base.init.call(this, {maxItems: RBN.Settings.get().maxItems});

        this.fuse = null;
        this.itemsIds = [];
        this.badImageMap = {};

        this.$target = $('#items');
        this.$searchTarget = $('#search-items');

        this.$spinner = $('#spinner');

        this.pollTimer = null;

        if (this.items.length === 0) {
          this.$spinner.addClass('spin');
        }

        // Load data, and start polling
        this.loadData()
          .done(_.bind(function() {
            this.$spinner.removeClass('spin');
          }, this))
          .done(_.bind(this.startPolling, this));

        this.bindEvents();

        chrome.browserAction.setBadgeText({text: ''});
      },
      bindEvents: function() {
        var bound = _.bind(this.onItemClick, this);
        this.$target.on('click', 'li', bound);
        this.$searchTarget.on('click', 'li', bound);
      },
      onItemClick: function(event) {
        var $target = $(event.target).closest('li');
        var attrId = $target.data('item-id');
        chrome.tabs.create({url: 'https://rb.corp.linkedin.com/r/' + attrId});
      },

      search: function(text) {
        this.searchItems = this.fuse.search(text);

        this.resetSearch();

        if (text.length === 0) {
          this.$searchTarget.hide();
          this.$target.show();
          if (this._shouldRerender) {
            this.render();
            this._shouldRerender = false;
          }
          return;
        }

        this.$searchTarget.empty().show();
        this.render();
        this.$target.hide();
      },

      numberOfSections: function () {
        if (this.isSearchVisible()) {
          return 1;
        } else {
          return base.numberOfSections.call(this);
        }
      },
      numberOfRowsInSection: function (sectionIndex) {
        if (this.isSearchVisible()) {
          return this.searchItems.length;
        } else {
          return base.numberOfRowsInSection.call(this, sectionIndex);
        }
      },
      itemAtIndex: function (sectionIndex, itemIndex) {
        if (this.isSearchVisible()) {
          return this.searchItems[itemIndex];
        } else {
          return base.itemAtIndex.call(this, sectionIndex, itemIndex);
        }
      },
      loadData: function(refresh) {
        return RBN.DAL.getAllRBs(refresh).done(_.bind(function(items) {
          this.update(items);
        }, this));
      },
      update: function(items) {
        this.reset();
        this.items.push(items);

        if (this.isSearchVisible()) {
          this._shouldRerender = true;
        } else {
          this.render();
          this._shouldRerender = false;
        }

        this.itemsIds = _.map(items, function(item) {
          return item.id;
        });

        this.fuse = new Fuse(items, {
          keys: ['summary', 'submitter']
        });
      },
      startPolling: function() {
        var bound = _.bind(function() {
          this.loadData(true)
            .done(_.bind(this.startPolling, this));
        }, this);

        this.pollTimer = setTimeout(bound, RBN.Settings.get().pollInterval);
      },
      stopPolling: function() {
        clearTimeout(this.pollTimer);
        this.pollTimer = null;
      },
      cellForRowAtIndex: function (sectionIndex, itemIndex) {
        var data = this.itemAtIndex(sectionIndex, itemIndex);
        return options.template(data);
      },
      computeImages: function() {
        var self = this;
        var $target;

        if (this.isSearchVisible()) {
          $target = this.$searchTarget;
        } else {
          $target = this.$target;
        }

        $target.find('img').each(function() {
          var $img = $(this),
            id = $img.closest('li').data('item-id'),
            src = $img.attr('src');

          if (self.badImageMap[id]) {
            $img.attr('src', GHOST_PERSON_IMG)
          } else {
            $img.error(function() {
              $img.attr('src', GHOST_PERSON_IMG);
              self.badImageMap[id] = true;
            });
          }
        });
      },
      render: function() {
        var output = base.render.call(this);

        if (this.isSearchVisible()) {
          this.$searchTarget.append(output);
        } else {
          this.$target.append(output);
        }

        this.computeImages();
      }
    }
  });

});