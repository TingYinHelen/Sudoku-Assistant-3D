(function () {

    Sudoku.Solver = function (gameBoard, solver) {

        Utils.EventTarget.call(this);

        this._n = gameBoard.getGameSize();
        this._nSqrd = this._n * this._n;
        this._gameBoard = gameBoard;

        this._certainCells = [] //{i,j,row,column,element,subGrid} -> row column element and subGrid props have boolean values.

        if (solver instanceof Sudoku.Solver) {
            this._parent = solver;
        } else {
            this._parent = null;
        }

        this._children = []; //for exploring forks

        this._possibilityCube = Utils.MultiArray(this._nSqrd, this._nSqrd, this._nSqrd);

        for (var i = 0; i < this._nSqrd; i++) {
            for (var j = 0; j < this._nSqrd; j++) {
                for (var k = 0; k < this._nSqrd; k++) {
                    this._possibilityCube[i][j][k] = Sudoku.Solver.possibilityAlive;
                }
            }
        }

        this._rowCounters = Utils.MultiArray(this._nSqrd, this._nSqrd);
        this._columnCounters = Utils.MultiArray(this._nSqrd, this._nSqrd);
        this._elementCounters = Utils.MultiArray(this._nSqrd, this._nSqrd);

        for (var i = 0; i < this._nSqrd; i++) {
            for (var j = 0; j < this._nSqrd; j++) {
                this._rowCounters[i][j] = this._nSqrd;
                this._columnCounters[i][j] = this._nSqrd;
                this._elementCounters[i][j] = this._nSqrd;
            }
        }

        this._subGridCounters = Utils.MultiArray(this._n, this._n, this._nSqrd);

        for (var i = 0; i < this._n; i++) {
            for (var j = 0; j < this._n; j++) {
                for (var k = 0; k < this._nSqrd; k++) {
                    this._subGridCounters[i][j][k] = this._nSqrd;
                }
            }
        }

        initialize.call(this);

    }


    Sudoku.Solver.possibilityAlive = 1;


    Sudoku.Solver.possibilityDead = 0;


    Sudoku.Solver.prototype = {


        constructor:Sudoku.Solver,


        possibilityIsAlive:function (i, j, value) {

            return this._possibilityCube[i][j][value - 1] === Sudoku.Solver.possibilityAlive;

        },


        getListOfCertainCells:function () {

            var arr = [];

            for (var i = 0, l = this._currentCertainCells.length; i < l; i++) {
                arr[i] = {
                    i:this._currentCertainCells[i].i,
                    j:this._currentCertainCells[i].j,
                    value:this._currentCertainCells.value
                }
            }

            return arr;

        }

    };


    function initialize() {

        var value
            ;

        for (var i = 0; i < this._nSqrd; i++) {
            for (var j = 0; j < this._nSqrd; j++) {
                if (value = this._gameBoard.getValue(i, j) !== Sudoku.GameBoard.emptyCell) {
                    killPossibilities.call(this, {i:i, j:j, value:value});
                }
            }
        }

        this._gameBoard.addEventListener('valueEntered', killPossibilities.bind(this));

        this._gameBoard.addEventListener('valueCleared', revivePossibilities.bind(this));

        return this;

    }


    function killPossibilities(event) {

        var i = event.i
            , j = event.j
            , k = event.value - 1
            , sgb = this._gameBoard.getSubGridBoundsContainingCell(i, j)
            , gbc = {i:event.i, j:event.j, value:event.value}
            , iTemp
            , jTemp
            , kTemp
            ;

        /*killRowPossibilities*/
        for (var jTemp = 0; jTemp < this._nSqrd; jTemp++) {
            killPossibilityCell.call(this, i, jTemp, k, gbc);
        }
        /*killColumnPossibilities*/
        for (var iTemp = 0; iTemp < this._nSqrd; iTemp++) {
            killPossibilityCell.call(this, iTemp, j, k, gbc);
        }
        /*killElementPossibilities*/
        for (var kTemp = 0; kTemp < this._nSqrd; kTemp++) {
            killPossibilityCell.call(this, i, j, kTemp, gbc);
        }
        /*killSubGridPossibilities*/
        for (var iTemp = sgb.iLower; iTemp <= sgb.iUpper; iTemp++) {
            for (var jTemp = sgb.jLower; jTemp <= sgb.jUpper; jTemp++) {
                killPossibilityCell.call(this, iTemp, jTemp, k, gbc);
            }
        }

        return this;

    }


    function revivePossibilities(event) {

        var i = event.i
            , j = event.j
            , k = event.value - 1
            , sgb = this._gameBoard.getSubGridBoundsContainingCell(i, j)
            , iTemp
            , jTemp
            , kTemp
            ;

        /*reviveRowPossibilities*/
        for (var jTemp = 0; jTemp < this._nSqrd; jTemp++) {
            revivePossibilityCell.call(this, i, jTemp, k);
        }
        /*reviveColumnPossibilities*/
        for (var iTemp = 0; iTemp < this._nSqrd; iTemp++) {
            revivePossibilityCell.call(this, iTemp, j, k);
        }
        /*reviveElementPossibilities*/
        for (var kTemp = 0; kTemp < this._nSqrd; kTemp++) {
            revivePossibilityCell.call(this, i, j, kTemp);
        }
        /*revivesubGridPossibilities*/
        for (var iTemp = sgb.iLower; iTemp <= sgb.iUpper; iTemp++) {
            for (var jTemp = sgb.jLower; jTemp <= sgb.jUpper; jTemp++) {
                revivePossibilityCell.call(this, iTemp, jTemp, k)
            }
        }

        return this;

    }


    function revivePossibilityCell(i, j, k) {

        if (this._possibilityCube[i][j][k] === Sudoku.Solver.possibilityDead) {
            this._possibilityCube[i][j][k] = Sudoku.Solver.possibilityAlive;
            incrementCounters.call(this, i, j, k);
            this.dispatchEvent({
                type:"possibilityCellRevived",
                i:i,
                j:j,
                k:k
            });
        }
        return this;
    }


    function killPossibilityCell(i, j, k, gbc) {

        if (this._possibilityCube[i][j][k] === Sudoku.Solver.possibilityAlive) {
            this._possibilityCube[i][j][k] = Sudoku.Solver.possibilityDead;
            decrementCounters.call(this, i, j, k, gbc);
            this.dispatchEvent({
                type:"possibilityCellRevived",
                i:i,
                j:j,
                k:k
            });
        }
        return this;

    }


    function getListOfCertainElementsByRowColumnAndSubGridCounter() {


    }

    /* gbc -> gameBoardCell coordinates and value for the
     cell that started the killing process for error checking
     purposes
     */
    function decrementCounters(i, j, k, gbc) {
        var errorFound = false
            , sgb = this._gameBoard.getSubGridBoundsContainingCell(i, j)
            , gbcSgb = this._gameBoard.getSubGridBoundsContainingCell(gbc.i, gbc.j)
            ;
        /*decrement relevant counters and if the counter
         is zero and the relevant dimension is not the same
         as the originating cell that started the killing process this
         branch has no solution and need not be investigated further
         */
        if (!--this._rowCounters[i][k] && gbc.i !== i) {
            errorFound = true;
        }
        if (!--this._columnCounters[j][k] && gbc.j !== j) {
            errorFound = true;
        }
        if (!--this._elementCounters[i][j] && gbc.i !== i && gbc.j !== j) {
            errorFound = true;
        }
        if (!--this._subGridCounters[sgb.iSubGrid][sgb.jSubGrid][k] &&
            gbcSgb.iSubGrid !== sgb.iSubGrid &&
            gbcSgb.jSubGrid !== sgb.jSubGrid) {
            errorFound = true;
        }
        if (errorFound) {
            this.dispatchEvent({
                type:"insolvableBranch"
            });
        }
    }


    function incrementCounters(i, j, k) {
        var sgb = this._gameBoard.getSubGridBoundsContainingCell(i, j);
        this._rowCounters[i][k]++;
        this._columnCounters[j][k]++;
        this._elementCounters[i][j]++;
        this._subGridCounters[sgb.iSubGrid][sgb.jSubGrid][k]++;

    }


})();