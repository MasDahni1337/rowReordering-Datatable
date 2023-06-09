/**
* jQuery DataTables row reordering plugin.
* preview version {1.0.0}
* @version 1.0.1
* @author Jonathan Hoguet
* @contributor MasDahni1337 <Github>
* updated by => MasDahni1337 {version 1.0.1}
* changelog :
  - fixed bug fnGetState fromPosition NaN and toPosition NaN when use server side datatable
  - add new paramater $datatable in fnGetState to get a list table row
*/
(function ($) {
   "use strict";
   $.fn.rowReordering = function (options) {

      function _fnStartProcessingMode(oTable) {
         if (oTable.fnSettings().oFeatures.bProcessing) {
            $(".dataTables_processing").css('visibility', 'visible');
         }
      }

      function _fnEndProcessingMode(oTable) {
         if (oTable.fnSettings().oFeatures.bProcessing) {
            $(".dataTables_processing").css('visibility', 'hidden');
         }
      }

      function fnGetStartPosition(oTable, sSelector) {
         var iStart = 1000000;
         $(sSelector, oTable).each(function () {
            iPosition = parseInt(oTable.fnGetData(this, properties.iIndexColumn), 10);
            if (iPosition < iStart)
               iStart = iPosition;
         });
         return iStart;
      }

      function fnCancelSorting(oTable, tbody, properties, iLogLevel, sMessage) {
         tbody.sortable('cancel');
         if (iLogLevel <= properties.iLogLevel) {
            if (sMessage != undefined) {
               properties.fnAlert(sMessage, "");
            } else {
               properties.fnAlert("Row cannot be moved", "");
            }
         }
         properties.fnEndProcessingMode(oTable);
      }

      function fnGetState($dataTable, sSelector, tr, properties) {
         var iCurrentPosition = -1;
         var aPositions = [];
         var sDirection;

         $dataTable.$(sSelector).each(function (index) {
            if (this == tr[0]) {
               iCurrentPosition = index;
            }
            aPositions.push(index);
         });

         if (iCurrentPosition == -1) {
            return {
               iCurrentPosition: -1,
               iNewPosition: -1,
               sDirection: "none"
            };
         }

         var iNewPosition = -1;
         var trPrevious = tr.prev(sSelector);
         if (trPrevious.length > 0) {
            var trNext = tr.next(sSelector);
            var isNewPosition = trNext.attr('id');
            isNewPosition = isNewPosition.split('-');
            isNewPosition = isNewPosition[1];
            isNewPosition = parseInt(isNewPosition) - 1;
            for (var i = iCurrentPosition + 1; i <= aPositions.length - 1; i++) {
               if (aPositions[i] != iCurrentPosition) {
                  iNewPosition = isNewPosition;
                  sDirection = "down";
               }
            }
         } else if (trPrevious.length == 0) {
            var trNext = tr.next(sSelector);
            if (trNext.length > 0) {
               for (var i = iCurrentPosition - 1; i >= 0; i--) {
                  if (aPositions[i] != iCurrentPosition) {
                     iNewPosition = aPositions[i];
                     sDirection = "up";
                  }
               }
            }
         }
         return {
            iCurrentPosition: iCurrentPosition,
            iNewPosition: iNewPosition,
            sDirection: sDirection
         }
      }

      function fnMoveRows(oTable, sSelector, iCurrentPosition, iNewPosition, sDirection, id, sGroup) {
         var iStart = iCurrentPosition;
         var iEnd = iNewPosition;
         if (sDirection == "back") {
            iStart = iNewPosition;
            iEnd = iCurrentPosition;
         }

         $(oTable.fnGetNodes()).each(function () {
            if (sGroup != "" && $(this).attr("data-group") != sGroup)
               return;
            var tr = this;
            var iRowPosition = parseInt(oTable.fnGetData(tr, properties.iIndexColumn), 10);
            if (iStart <= iRowPosition && iRowPosition <= iEnd) {
               if (tr.id == id) {
                  oTable.fnUpdate(iNewPosition,
                     oTable.fnGetPosition(tr),
                     properties.iIndexColumn,
                     false);
               } else {
                  if (sDirection == "back") {
                     oTable.fnUpdate(iRowPosition + 1,
                        oTable.fnGetPosition(tr),
                        properties.iIndexColumn,
                        false);
                  } else {
                     oTable.fnUpdate(iRowPosition - 1,
                        oTable.fnGetPosition(tr),
                        properties.iIndexColumn,
                        false);
                  }
               }
            }
         });

         var oSettings = oTable.fnSettings();

         if (oSettings.oFeatures.bServerSide === false) {
            var before = oSettings._iDisplayStart;
            oSettings.oApi._fnReDraw(oSettings);
            oSettings._iDisplayStart = before;
            oSettings.oApi._fnCalculateEnd(oSettings);
         }
         oSettings.oApi._fnDraw(oSettings);
      }

      function _fnAlert(message, type) {
         alert(message);
      }

      var defaults = {
         iIndexColumn: 0,
         iStartPosition: 1,
         sURL: null,
         sRequestType: "POST",
         iGroupingLevel: 0,
         fnAlert: _fnAlert,
         fnSuccess: jQuery.noop,
         iLogLevel: 1,
         sDataGroupAttribute: "data-group",
         fnStartProcessingMode: _fnStartProcessingMode,
         fnEndProcessingMode: _fnEndProcessingMode,
         fnUpdateAjaxRequest: jQuery.noop
      };

      var properties = $.extend(defaults, options);

      var iFrom, iTo;
      var tableFixHelper = function (e, tr) {
         var $originals = tr.children();
         var $helper = tr.clone();
         $helper.children().each(function (index) {
            $(this).width($originals.eq(index).width());
         });
         return $helper;
      };
      var tables;
      if (this instanceof jQuery) {
         tables = this;
      } else {
         tables = this.context;
      }

      $.each(tables, function () {
         var oTable;

         if (typeof this.nodeType !== 'undefined') {
            oTable = $(this).dataTable();
         } else {
            oTable = $(this.nTable).dataTable();
         }

         var aaSortingFixed = (oTable.fnSettings().aaSortingFixed == null ? new Array() : oTable.fnSettings().aaSortingFixed);
         aaSortingFixed.push([properties.iIndexColumn, "asc"]);

         oTable.fnSettings().aaSortingFixed = aaSortingFixed;


         for (var i = 0; i < oTable.fnSettings().aoColumns.length; i++) {
            oTable.fnSettings().aoColumns[i].bSortable = false;
         }
         oTable.fnDraw();

         $("tbody", oTable).disableSelection().sortable({
            cursor: "move",
            helper: tableFixHelper,
            update: function (event, ui) {
               var $dataTable = oTable;
               var tbody = $(this);
               var sSelector = "tbody tr";
               var sGroup = "";
               if (properties.bGroupingUsed) {
                  sGroup = $(ui.item).attr(properties.sDataGroupAttribute);
                  if (sGroup == null || sGroup == undefined) {
                     fnCancelSorting($dataTable, tbody, properties, 3, "Grouping row cannot be moved");
                     return;
                  }
                  sSelector = "tbody tr[" + properties.sDataGroupAttribute + " ='" + sGroup + "']";
               }
               var tr = $(ui.item.context);
               var oState = fnGetState($dataTable, sSelector, tr, properties);
               if (oState.iNewPosition == -1) {
                  fnCancelSorting($dataTable, tbody, properties, 2);
                  return;
               }

               var sRequestData = {
                  id: ui.item.context.id,
                  fromPosition: oState.iCurrentPosition,
                  toPosition: oState.iNewPosition,
                  direction: oState.sDirection,
                  group: sGroup,
                  data: properties.sData
               };


               if (properties.sURL != null) {
                  properties.fnStartProcessingMode($dataTable);
                  var oAjaxRequest = {
                     url: properties.sURL,
                     type: properties.sRequestType,
                     data: sRequestData,
                     success: function (data) {
                        properties.fnSuccess(data);
                        if (!properties.avoidMovingRows)
                           fnMoveRows($dataTable, sSelector, oState.iCurrentPosition, oState.iNewPosition, oState.sDirection, ui.item.context.id, sGroup);
                        properties.fnEndProcessingMode($dataTable);
                        if (properties.fnUpdateCallback && typeof (properties.fnUpdateCallback) === 'function') {
                           properties.fnUpdateCallback(sRequestData);
                        }
                     },
                     error: function (jqXHR) {
                        var err = (jqXHR.responseText != "" ? jqXHR.responseText : jqXHR.statusText);
                        fnCancelSorting($dataTable, tbody, properties, 1, err);
                     }
                  };
                  properties.fnUpdateAjaxRequest(oAjaxRequest, properties, $dataTable);
                  $.ajax(oAjaxRequest);
               } else {
                  fnMoveRows($dataTable, sSelector, oState.iCurrentPosition, oState.iNewPosition, oState.sDirection, ui.item.context.id, sGroup);
                  if (properties.fnUpdateCallback && typeof (properties.fnUpdateCallback) === 'function') {
                     properties.fnUpdateCallback(sRequestData);
                  }
               }

            }
         });
      });

      return this;
   };
   $.fn.dataTable.rowReordering = $.fn.rowReordering;
   $.fn.DataTable.rowReordering = $.fn.rowReordering;

   if ($.fn.dataTable.Api) {
      var Api = $.fn.dataTable.Api;
      Api.register('rowReordering()', $.fn.rowReordering);
   }
})(jQuery);
