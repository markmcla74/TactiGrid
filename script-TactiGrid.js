    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
            .then((reg) => console.log('Service Worker registered:', reg.scope))
            .catch((err) => console.error('Service Worker registration failed:', err));
        });
    }
    const gridSize = 6;
    const colors = ["G", "B"];
    let randomNumber;
    let gameOver = false; //flag used to disable movement when game is over
    let isOnePlayer = false;
    let turnTracker = 0;
    let p1CamouflageTurns = 0;
    let lastKnownP1Pos = {
        row: null,
        col: null
    };
    let assumedP1Pos = {
        row: null,
        col: null
    };
    let grid = [];
    // Movement offsets
    const directions = {
        "btn-p1-up": [-1, 0],
        "btn-p1-down": [1, 0],
        "btn-p1-left": [0, -1],
        "btn-p1-right": [0, 1],
        "btn-p2-up": [-1, 0],
        "btn-p2-down": [1, 0],
        "btn-p2-left": [0, -1],
        "btn-p2-right": [0, 1],
    };
    // --- Inside AudioEngine return object or exposed methods ---

    // Players
    let players = {
        P1: {
            row: 0,
            col: 0,
            symbol: "●",
            css: "p1",
            camouflaged: false, // new field
            camouflagedColor: null, // remembers what tile color they’re blending into
            glows: 2,
            defaultColor: "black",
            playerColor: "black"
        },
        P2: {
            row: 5,
            col: 5,
            symbol: "●",
            css: "p2",
            camouflaged: false, // new field
            camouflagedColor: null,
            glows: 2,
            defaultColor: "blue",
            playerColor: "blue"
        }
    };

    // Turn tracker
    let currentPlayer = "P1";

    // Generate grid with random colors
    for (let r = 0; r < gridSize; r++) {
        grid[r] = [];
        for (let c = 0; c < gridSize; c++) {
            grid[r][c] = colors[Math.floor(Math.random() * colors.length)];
        }
    }

    // Render grid
    function renderGrid() {
        let html = "";
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                let cellClass = grid[r][c];
                let symbol = "";
                let cssClass = "";
                if ((r === 0 && c === 0) || (r === gridSize - 1 && c === gridSize - 1)) {
                    cellClass += " corner";
                }
                if (r === 0 && c === 2) {
                    cellClass += " door-orange-top"; // top row, glow on bottom edge
                }
                if (r === 5 && c === 2) {
                    cellClass += " door-red-bottom"; // bottom row, glow on top edge
                }
                if (r === 3 && c === 0) {
                    cellClass += " door-blue-left"; // left edge, glow on right side
                }
                if (r === 3 && c === 5) {
                    cellClass += " door-purple-right"; // right edge, glow on left side
                }

                if (r === 2 && c === 2) {
                    cellClass += " centerTile-orange"; // top row, glow on bottom edge
                }
                if (r === 2 && c === 3) {
                    cellClass += " centerTile-purple"; // bottom row, glow on top edge
                }
                if (r === 3 && c === 2) {
                    cellClass += " centerTile-blue"; // left edge, glow on right side
                }
                if (r === 3 && c === 3) {
                    cellClass += " centerTile-red"; // right edge, glow on left side
                }

                // Players
                if (players.P1.row === r && players.P1.col === c) {
                    symbol = players.P1.symbol;
                    cssClass = players.P1.css;
                    html += `<div id="cell-${r}-${c}" class="cell ${cellClass} ${cssClass}" style="color:${players.P1.playerColor}">${symbol}</div>`;

                } else if (players.P2.row === r && players.P2.col === c) {
                    symbol = players.P2.symbol;
                    cssClass = players.P2.css;
                    html += `<div id="cell-${r}-${c}" class="cell ${cellClass} ${cssClass}" style="color:${players.P2.playerColor}">${symbol}</div>`;
                } else {
                    html += `<div id="cell-${r}-${c}" class="cell ${cellClass} ${cssClass}">${symbol}</div>`;
                }
            }
        }

        document.getElementById("game").innerHTML = html;
        //possible turn tracking stuff
        //if (currentPlayer === "P1") {
        //} else {
        //}


    }

    function resetGame() {
        // Reset players
        players = {
            P1: {
                row: 0,
                col: 0,
                symbol: "●",
                css: "p1",
                camouflaged: false,
                camouflagedColor: null,
                glows: 2,
                playerColor: "black"
            },
            P2: {
                row: 5,
                col: 5,
                symbol: "●",
                css: "p2",
                camouflaged: false,
                camouflagedColor: null,
                glows: 2,
                playerColor: "blue"
            }
        };

        // Reset turn
        currentPlayer = "P1";
        p1CamouflageTurns = 0; // reset when visible
        gameOver = false;
        updateButtonStates();





        // Generate grid with random colors
        for (let r = 0; r < gridSize; r++) {
            grid[r] = [];
            for (let c = 0; c < gridSize; c++) {
                grid[r][c] = colors[Math.floor(Math.random() * colors.length)];
            }
        }

        // Reset grid
        document.getElementById("reset-btn").disabled = true;
        renderGrid();

        // Show overlay again
        document.getElementById("overlay").style.display = "flex";
        setGameButtonsDisabled(false);

        // 💡 Sync the glow button UI back to 2 lightbulbs and enable it
        updateGlowButton("P1");
        updateGlowButton("P2");



    }

    //renderGrid();

    function processPlayerMove(actionKey) {
        if (gameOver) return 1; // ignore actionKeys if game ended
        let enterDoor = false;
        let distance;
        let camouflagedColor;
        let player, opponent;

        if (currentPlayer === "P1") {
            player = players.P1;
            opponent = players.P2;
        } else {
            player = players.P2;
            opponent = players.P1;
        }

        let dir = directions[actionKey];


        // --- ACTIONS ---

            switch (actionKey) {
                //Attack Actions
                case "btn-p1-attack":
                    glowAttack(player, opponent);
                    AudioEngine.playVictoryChime();
                    AudioEngine.stopAllAfter(2); // both end in 2 seconds
                    distance = Math.abs(player.row - opponent.row) + Math.abs(player.col - opponent.col);
                    if (distance <= 2) {
                        // Successful attack
                        player.symbol = "●";
                        opponent.symbol = "💥";
                        document.getElementById("reset-btn").disabled = false;
                        gameOver = true;
                        renderGrid();
                        updateButtonStates();
                        setTimeout(() => {
                            showMessage(`Player 1 wins with a successful attack!`);
                        }, 50);
                     } else {
                        // Failed attack → opponent wins
                        opponent.symbol = "●";
                        player.symbol = "💥";
                        document.getElementById("reset-btn").disabled = false;
                        gameOver = true;
                        renderGrid();
                        updateButtonStates();
                        setTimeout(() => {
                        showMessage(`Player 1 missed! Player 2 wins!`);
                        }, 50);
                    }
                    return 1;
                    break;
                case "btn-p2-attack":
                    glowAttack(player, opponent);
                    AudioEngine.playVictoryChime();
                    AudioEngine.stopAllAfter(2); // both end in 2 seconds
                    distance = Math.abs(player.row - opponent.row) + Math.abs(player.col - opponent.col);
                    if (distance <= 2) {
                        // Successful attack
                        player.symbol = "●";
                        opponent.symbol = "💥";
                        document.getElementById("reset-btn").disabled = false;
                        gameOver = true;
                        renderGrid();
                        setTimeout(() => {
                            showMessage(`Player 2 wins with a successful attack!`);
                        }, 50);
                    } else {
                        // Failed attack → opponent wins
                        opponent.symbol = "●";
                        player.symbol = "💥";
                        document.getElementById("reset-btn").disabled = false;
                        gameOver = true;
                        renderGrid();
                        setTimeout(() => {
                            showMessage(`Player 2 missed! Player 1 wins!`);
                        }, 50);
                    }
                    return 1;
                    break;
                case "btn-p1-glow":
                    if (player.glows <= 0) return 0; // Prevent turn from ending if out of glows
                    AudioEngine.playPlayerChime("P1");
                    console.log("here glow");
                    if (player.glows > 0) {
                        player.glows--;
                        updateGlowButton("P1");
                        // Reveal opponent if camouflaged
                        if (opponent.camouflaged) {
                            opponent.camouflaged = false;
                            opponent.symbol = "●";
                            glowOpponent(opponent);
                        }
                    }
                    return 1;
                    break;
                case "btn-p2-glow":
                    if (player.glows <= 0) return 0; // Prevent turn from ending if out of glows
                    AudioEngine.playPlayerChime("P2");
                    if (player.glows > 0) {
                        player.glows--;
                        updateGlowButton("P2");
                        // Reveal opponent if camouflaged
                        if (opponent.camouflaged) {
                            opponent.camouflaged = false;
                            opponent.symbol = "●";
                            glowOpponent(opponent);
                        }
                    }
                    if (opponent.camouflaged == false) { // i.e. P1 is revealed needed for 1 player mode
                        p1CamouflageTurns = 0;
                    }
                    //updateGlowButton("P2");
                    return 1;
                    break;
                case "btn-p1-camouflage":
                    // --- Camouflage actionKeys ---
                    AudioEngine.playPlayerChime("P1");
                    camouflagedColor = grid[player.row][player.col];
                    player.camouflaged = true;
                    player.camouflagedColor = camouflagedColor;
                    player.symbol = "";
                    p1CamouflageTurns++; //needed to track for 1 player mode
                    // End turn after camouflage
                    return 1; // don’t check movement
                    break;
                case "btn-p2-camouflage":
                    // --- Camouflage actionKeys ---
                    AudioEngine.playPlayerChime("P2");
                    camouflagedColor = grid[player.row][player.col];
                    player.camouflaged = true;
                    player.camouflagedColor = camouflagedColor;
                    player.symbol = "";
                    // End turn after camouflage
                    return 1; // don’t check movement
                    break;
                case "btn-p1-up":
                    // ---Not allowed move actions, attempting to move outside of the grid ---
                    if (player.row == 0 && player.col != 2) {
                        return 0;
                    }

                    //check orange door at row 0, col 2 for Player 1
                    if (player.row === 0 && player.col === 2) {
                        AudioEngine.playPlayerChime("P1");
                        enterDoor = true;
                    }
                    if (enterDoor === true) {
                        player.row = 2;
                        player.col = 2;


                        // If a camouflaged player moves to a tile with a different color, they should no longer be camouflaged, and return to original color
                        if (player.camouflaged) {
                            if (grid[player.row][player.col] !== player.camouflagedColor) {
                                // Different color → break camouflage
                                player.camouflaged = false;
                                player.camouflagedColor = null;
                                player.symbol = "●";
                            }
                        }

                        if (player.camouflaged == true) {
                            p1CamouflageTurns++;
                        }
                        if (player.camouflaged == false) {
                            p1CamouflageTurns = 0;
                        }
                        return 1;
                    }
                    // Stay inside grid bounds for all other cases
                    if (enterDoor === false) {
                        //playChime();
                        AudioEngine.playPlayerChime("P1");
                        player.row = player.row + dir[0];
                        player.col = player.col + dir[1];

                        // If a camouflaged player moves to a tile with a different color, they should no longer be camouflaged, and return to original color
                        if (player.camouflaged) {
                            if (grid[player.row][player.col] !== player.camouflagedColor) {
                                // Different color → break camouflage
                                player.camouflaged = false;
                                player.camouflagedColor = null;
                                player.symbol = "●";
                            }
                        }

                        //check corner win
                        checkCornerWin();
                        if (player.camouflaged == true) {
                            p1CamouflageTurns++;
                        }
                        if (player.camouflaged == false) {
                            p1CamouflageTurns = 0;
                        }
                        return 1;
                    }
                    break;
                case "btn-p2-up":
                    // ---Not allowed move actions, attempting to move outside of the grid ---
                    if (player.row == 0 && player.col != 2) {
                        return 0;
                    }
                    //check orange door at row 0, col 2 for Player 2. Funnels to row 2, col 2
                    if (player.row === 0 && player.col === 2) {
                        AudioEngine.playPlayerChime("P2");
                        enterDoor = true;
                    }
                    if (enterDoor === true) {
                        player.row = 2;
                        player.col = 2;


                        // If a camouflaged player moves to a tile with a different color, they should no longer be camouflaged, and return to original color
                        if (player.camouflaged) {
                            if (grid[player.row][player.col] !== player.camouflagedColor) {
                                // Different color → break camouflage
                                player.camouflaged = false;
                                player.camouflagedColor = null;
                                player.symbol = "●";
                            }
                        }
                        return 1;
                    }
                    // Stay inside grid bounds for all other cases
                    if (enterDoor === false) {
                        //playChime();
                        AudioEngine.playPlayerChime("P2");
                        player.row = player.row + dir[0];
                        player.col = player.col + dir[1];


                        // If a camouflaged player moves to a tile with a different color, they should no longer be camouflaged, and return to original color
                        if (player.camouflaged) {
                            if (grid[player.row][player.col] !== player.camouflagedColor) {
                                // Different color → break camouflage
                                player.camouflaged = false;
                                player.camouflagedColor = null;
                                player.symbol = "●";
                            }
                        }

                        //check corner win
                        checkCornerWin();
                        return 1;
                    }
                    break;
                case "btn-p1-down":
                    // ---Not allowed move actions, attempting to move outside of the grid ---
                    if (player.row == 5 && player.col != 2) {
                        return 0;
                    }
                    //check red door at row 5, col 2 for Player 1
                    if (player.row === 5 && player.col === 2) {
                        AudioEngine.playPlayerChime("P1");
                        enterDoor = true;
                    }
                    if (enterDoor === true) {
                        player.row = 3;
                        player.col = 3;


                        // If a camouflaged player moves to a tile with a different color, they should no longer be camouflaged, and return to original color
                        if (player.camouflaged) {
                            if (grid[player.row][player.col] !== player.camouflagedColor) {
                                // Different color → break camouflage
                                player.camouflaged = false;
                                player.camouflagedColor = null;
                                player.symbol = "●";
                            }
                        }

                        if (player.camouflaged == true) {
                            p1CamouflageTurns++;
                        }
                        if (player.camouflaged == false) {
                            p1CamouflageTurns = 0;
                        }
                        return 1;
                    }
                    // Stay inside grid bounds for all other cases
                    if (enterDoor === false) {
                        //playChime();
                        AudioEngine.playPlayerChime("P1");
                        player.row = player.row + dir[0];
                        player.col = player.col + dir[1];

                        // If a camouflaged player moves to a tile with a different color, they should no longer be camouflaged, and return to original color
                        if (player.camouflaged) {
                            if (grid[player.row][player.col] !== player.camouflagedColor) {
                                // Different color → break camouflage
                                player.camouflaged = false;
                                player.camouflagedColor = null;
                                player.symbol = "●";
                            }
                        }

                        //check corner win
                        checkCornerWin();
                        if (player.camouflaged == true) {
                            p1CamouflageTurns++;
                        }
                        if (player.camouflaged == false) {
                            p1CamouflageTurns = 0;
                        }
                        return 1;
                    }
                    break;
                case "btn-p2-down":
                    // ---Not allowed move actions, attempting to move outside of the grid ---
                    if (player.row == 5 && player.col != 2) {
                        return 0;
                    }
                    //check red door at row 5, col 2 for Player 1
                    if (player.row === 5 && player.col === 2) {
                        AudioEngine.playPlayerChime("P2");
                        enterDoor = true;
                    }
                    if (enterDoor === true) {
                        player.row = 3;
                        player.col = 3;


                        // If a camouflaged player moves to a tile with a different color, they should no longer be camouflaged, and return to original color
                        if (player.camouflaged) {
                            if (grid[player.row][player.col] !== player.camouflagedColor) {
                                // Different color → break camouflage
                                player.camouflaged = false;
                                player.camouflagedColor = null;
                                player.symbol = "●";
                            }
                        }
                        return 1;
                    }
                    // Stay inside grid bounds for all other cases
                    if (enterDoor === false) {
                        //playChime();
                        AudioEngine.playPlayerChime("P2");
                        player.row = player.row + dir[0];
                        player.col = player.col + dir[1];

                        // If a camouflaged player moves to a tile with a different color, they should no longer be camouflaged, and return to original color
                        if (player.camouflaged) {
                            if (grid[player.row][player.col] !== player.camouflagedColor) {
                                // Different color → break camouflage
                                player.camouflaged = false;
                                player.camouflagedColor = null;
                                player.symbol = "●";
                            }
                        }

                        //check corner win
                        checkCornerWin();
                        if (player.camouflaged == true) {
                            p1CamouflageTurns++;
                        }
                        if (player.camouflaged == false) {
                            p1CamouflageTurns = 0;
                        }
                        return 1;
                    }
                    break;
                case "btn-p1-left":
                    // ---Not allowed move actions, attempting to move outside of the grid ---
                    if (player.row != 3 && player.col == 0) {
                        //checkCornerWin();
                        return 0;
                    }
                    //check blue door at row 3, col 0 for Player 1
                    if (player.row === 3 && player.col === 0) {
                        AudioEngine.playPlayerChime("P1");
                        enterDoor = true;
                    }
                    if (enterDoor === true) {
                        player.row = 3;
                        player.col = 2;


                        // If a camouflaged player moves to a tile with a different color, they should no longer be camouflaged, and return to original color
                        if (player.camouflaged) {
                            if (grid[player.row][player.col] !== player.camouflagedColor) {
                                // Different color → break camouflage
                                player.camouflaged = false;
                                player.camouflagedColor = null;
                                player.symbol = "●";
                            }
                        }

                        if (player.camouflaged == true) {
                            p1CamouflageTurns++;
                        }
                        if (player.camouflaged == false) {
                            p1CamouflageTurns = 0;
                        }
                        return 1;
                    }
                    // Stay inside grid bounds for all other cases
                    if (enterDoor === false) {
                        //playChime();
                        AudioEngine.playPlayerChime("P1");
                        player.row = player.row + dir[0];
                        player.col = player.col + dir[1];

                        // If a camouflaged player moves to a tile with a different color, they should no longer be camouflaged, and return to original color
                        if (player.camouflaged) {
                            if (grid[player.row][player.col] !== player.camouflagedColor) {
                                // Different color → break camouflage
                                player.camouflaged = false;
                                player.camouflagedColor = null;
                                player.symbol = "●";
                            }
                        }

                        //check corner win
                        checkCornerWin();
                        if (player.camouflaged == true) {
                            p1CamouflageTurns++;
                        }
                        if (player.camouflaged == false) {
                            p1CamouflageTurns = 0;
                        }
                        return 1;
                    }
                    break;
                case "btn-p2-left":
                    // ---Not allowed move actions, attempting to move outside of the grid ---
                    if (player.row != 3 && player.col == 0) {
                        //checkCornerWin();
                        return 0;
                    }
                    //check blue door at row 3, col 0 for Player 1
                    if (player.row === 3 && player.col === 0) {
                        AudioEngine.playPlayerChime("P2");
                        enterDoor = true;
                    }
                    if (enterDoor === true) {
                        player.row = 3;
                        player.col = 2;


                        // If a camouflaged player moves to a tile with a different color, they should no longer be camouflaged, and return to original color
                        if (player.camouflaged) {
                            if (grid[player.row][player.col] !== player.camouflagedColor) {
                                // Different color → break camouflage
                                player.camouflaged = false;
                                player.camouflagedColor = null;
                                player.symbol = "●";
                            }
                        }
                        return 1;
                    }
                    // Stay inside grid bounds for all other cases
                    if (enterDoor === false) {
                        //playChime();
                        AudioEngine.playPlayerChime("P2");
                        player.row = player.row + dir[0];
                        player.col = player.col + dir[1];

                        // If a camouflaged player moves to a tile with a different color, they should no longer be camouflaged, and return to original color
                        if (player.camouflaged) {
                            if (grid[player.row][player.col] !== player.camouflagedColor) {
                                // Different color → break camouflage
                                player.camouflaged = false;
                                player.camouflagedColor = null;
                                player.symbol = "●";
                            }
                        }

                        //check corner win
                        checkCornerWin();
                        if (player.camouflaged == true) {
                            p1CamouflageTurns++;
                        }
                        if (player.camouflaged == false) {
                            p1CamouflageTurns = 0;
                        }
                        return 1;
                    }
                    break;
                case "btn-p1-right":
                    // ---Not allowed move actions, attempting to move outside of the grid ---
                    if (player.row != 3 && player.col == 5) {
                        return 0;
                    }
                    //check purple door at row 3, col 5 for Player 1
                    if (player.row === 3 && player.col === 5) {
                        AudioEngine.playPlayerChime("P1");
                        enterDoor = true;
                    }
                    if (enterDoor === true) {
                        player.row = 2;
                        player.col = 3;


                        // If a camouflaged player moves to a tile with a different color, they should no longer be camouflaged, and return to original color
                        if (player.camouflaged) {
                            if (grid[player.row][player.col] !== player.camouflagedColor) {
                                // Different color → break camouflage
                                player.camouflaged = false;
                                player.camouflagedColor = null;
                                player.symbol = "●";
                            }
                        }

                        if (player.camouflaged == true) {
                            p1CamouflageTurns++;
                        }
                        if (player.camouflaged == false) {
                            p1CamouflageTurns = 0;
                        }
                        return 1;
                    }
                    // Stay inside grid bounds for all other cases
                    if (enterDoor === false) {
                        //playChime();
                        AudioEngine.playPlayerChime("P1");
                        player.row = player.row + dir[0];
                        player.col = player.col + dir[1];

                        // If a camouflaged player moves to a tile with a different color, they should no longer be camouflaged, and return to original color
                        if (player.camouflaged) {
                            if (grid[player.row][player.col] !== player.camouflagedColor) {
                                // Different color → break camouflage
                                player.camouflaged = false;
                                player.camouflagedColor = null;
                                player.symbol = "●";
                            }
                        }

                        //check corner win
                        checkCornerWin();
                        if (player.camouflaged == true) {
                            p1CamouflageTurns++;
                        }
                        if (player.camouflaged == false) {
                            p1CamouflageTurns = 0;
                        }
                        return 1;
                    }
                    break;
                case "btn-p2-right":
                    // ---Not allowed move actions, attempting to move outside of the grid ---
                    if (player.row != 3 && player.col == 5) {
                        return 0;
                    }
                    //check purple door at row 3, col 5 for Player 1
                    if (player.row === 3 && player.col === 5) {
                        AudioEngine.playPlayerChime("P2");
                        enterDoor = true;
                    }
                    if (enterDoor === true) {
                        player.row = 2;
                        player.col = 3;


                        // If a camouflaged player moves to a tile with a different color, they should no longer be camouflaged, and return to original color
                        if (player.camouflaged) {
                            if (grid[player.row][player.col] !== player.camouflagedColor) {
                                // Different color → break camouflage
                                player.camouflaged = false;
                                player.camouflagedColor = null;
                                player.symbol = "●";
                            }
                        }

                        if (player.camouflaged == true) {
                            p1CamouflageTurns++;
                        }
                        if (player.camouflaged == false) {
                            p1CamouflageTurns = 0;
                        }
                        return 1;
                    }
                    // Stay inside grid bounds for all other cases
                    if (enterDoor === false) {
                        //playChime();
                        AudioEngine.playPlayerChime("P2");
                        player.row = player.row + dir[0];
                        player.col = player.col + dir[1];

                        // If a camouflaged player moves to a tile with a different color, they should no longer be camouflaged, and return to original color
                        if (player.camouflaged) {
                            if (grid[player.row][player.col] !== player.camouflagedColor) {
                                // Different color → break camouflage
                                player.camouflaged = false;
                                player.camouflagedColor = null;
                                player.symbol = "●";
                            }
                        }

                        //check corner win
                        checkCornerWin();
                        return 1;
                    }
                    break;
                default:
                    return 0; // Invalid key for P1
            }

    }


    // Robust interval-based glow that guarantees final color
    function glowOpponent(opponent, duration = 1000) {
        // Defensive: cancel any previous glow for this opponent
        if (opponent._glowInterval) {
            clearInterval(opponent._glowInterval);
            delete opponent._glowInterval;
        }

        const originalColor = opponent.defaultColor || opponent.playerColor || "black";

        const glowColors = [
            "#ffff66", "#fff176", "#ffee58", "#ffeb3b", "#fdd835", "#fbc02d",
            "#f9a825", "#f57f17", "#ff9800", "#fb8c00", "#f57c00", "#ef6c00"
        ];

        const steps = glowColors.length;
        const intervalTime = Math.max(10, Math.round(duration / steps)); // ms per step
        let step = 0;

        // Make sure the opponent is visible before starting the glow
        opponent.symbol = "●";

        // store interval id so we can clear it later if needed
        opponent._glowInterval = setInterval(() => {
            // update playerColor and re-render
            opponent.playerColor = glowColors[step];
            renderGrid();

            step++;

            if (step >= steps) {
                // finished: clear interval and restore original color
                clearInterval(opponent._glowInterval);
                delete opponent._glowInterval;

                // set the logical color back to the original
                opponent.playerColor = originalColor;

                // final render to sync DOM
                renderGrid();

                // Force a browser reflow/repaint and explicitly set the final color on the cell element.
                // This makes the final color stick even if some other small repaint race happens.
                const cellId = `cell-${opponent.row}-${opponent.col}`;
                // Use requestAnimationFrame twice to let browser process the render
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        const cellEl = document.getElementById(cellId);
                        if (cellEl) {
                            // directly set inline style as a last-resort guarantee of appearance
                            cellEl.style.color = originalColor;
                            // if you animate background instead, use:
                            // cellEl.style.backgroundColor = originalColor;
                        }
                    });
                });
            }
        }, intervalTime);
    }

    function glowAttack(attacker, opponent) {
        let glowColors = [
            "#ffff66", "#fff176", "#ffee58", "#ffeb3b", "#fdd835", "#fbc02d",
            "#f9a825", "#f57f17", "#ff9800", "#fb8c00", "#f57c00", "#ef6c00"
        ];
        opponent.symbol = "●"; //make both players visible
        attacker.symbol = "●";
        const intervalTime = 1000 / glowColors.length; // 1 second total
        let step = 0;
        //console.log("here");
        //grid[1][1]="purple";
        //document.getElementById('cell-1-1').style.backgroundColor = "purple"; // update display
        // Collect all cells within Manhattan distance 2
        const cellsToGlow = [];
        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 6; c++) {
                if (Math.abs(attacker.row - r) + Math.abs(attacker.col - c) <= 2) {
                    cellsToGlow.push({
                        row: r,
                        col: c
                    });
                }
            }
        }

        for (let colorIndex = 0; colorIndex < glowColors.length; colorIndex++) {
            setTimeout(function() {
                // inner loop over glowing cells
                for (let i = 0; i < cellsToGlow.length; i++) {
                    const cell = cellsToGlow[i];
                    const cellEl = document.getElementById(`cell-${cell.row}-${cell.col}`);
                    if (cellEl) {
                        cellEl.style.backgroundColor = glowColors[colorIndex];
                        //console.log("Setting color:", glowColors[colorIndex]);
                    }
                }
            }, colorIndex * 200); // delay increases with each color step
        }
    }

    function checkCornerWin() {
        if (players.P1.row === 5 && players.P1.col === 5) {
            showMessage("Player 1 Wins by reaching the corner!");
            players.P2.symbol = "💥"; // explosion for loser
            players.P1.symbol = "●";
            gameOver = true;
            document.getElementById("reset-btn").disabled = false;
            renderGrid();
            AudioEngine.playVictoryChime();
            AudioEngine.stopAllAfter(2); // both end in 2 seconds
            //  bgAudio.pause();
            //         bgAudio.currentTime = 0;
            updateButtonStates();
        } else if (players.P2.row === 0 && players.P2.col === 0) {
            showMessage("Player 2 Wins by reaching the corner!");
            players.P2.symbol = "●";
            players.P1.symbol = "💥"; // explosion for loser
            gameOver = true;
            AudioEngine.playVictoryChime();
            AudioEngine.stopAllAfter(2); // both end in 2 seconds
            document.getElementById("reset-btn").disabled = false;
            renderGrid();
            updateButtonStates();
        }
    }

    function showMessage(msg) {
        const messageBox = document.createElement("div");
        messageBox.textContent = msg;
        messageBox.style.position = "fixed";
        messageBox.style.top = "40%";
        messageBox.style.left = "50%";
        messageBox.style.transform = "translate(-50%, -50%)";
        messageBox.style.background = "rgba(0,0,0,0.7)";
        messageBox.style.color = "white";
        messageBox.style.padding = "20px 40px";
        messageBox.style.borderRadius = "12px";
        messageBox.style.fontSize = "1.5rem";
        messageBox.style.zIndex = "1000";
        document.body.appendChild(messageBox);
        setTimeout(() => {
            messageBox.remove(); // <- this deletes the message
        }, 4000);

    }

    function showTurnMessage(msg) {
        setTimeout(() => {
            const messageBox = document.createElement("div");
            messageBox.textContent = msg;
            messageBox.style.position = "fixed";
            messageBox.style.top = "15%";
            messageBox.style.left = "50%";
            messageBox.style.textAlign = "center";
            messageBox.style.transform = "translate(-50%, -50%)";
            messageBox.style.background = "rgba(0,0,0,0.7)";
            messageBox.style.color = "white";
            messageBox.style.padding = "20px 40px";
            messageBox.style.borderRadius = "12px";
            messageBox.style.fontSize = "1.2rem";
            messageBox.style.zIndex = "1000";

            document.body.appendChild(messageBox);

            setTimeout(() => {
                messageBox.remove(); // remove after visible for 1s
            }, 1500);

        }, 400); // ⏱️ delay before showing
    }
    /* ================================
     *   GLOBAL AUDIO ENGINE
     * ================================ */

    const AudioEngine = (() => {

        // --- SINGLE shared context ---
        const ctx = new (window.AudioContext || window.webkitAudioContext)();

        let masterGain = ctx.createGain();
        masterGain.gain.value = 0.5; // master volume
        masterGain.connect(ctx.destination);

        let jingleInterval = null;
        let jingleStartTime = 0;
        let isJinglePlaying = false;
        let isSoundEnabled = true; // Tracks sound state

        /* --------------------------------
         *       Unlock audio (required for mobile)
         *    -------------------------------- */
        function unlock() {
            if (ctx.state === "suspended") {
                ctx.resume();
            }
        }

        /* --------------------------------
         *       Generic retro blip
         *    -------------------------------- */
        function blip(freq, startTime, length = 0.18, volume = 0.25) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "square";
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(volume, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + length);

            osc.connect(gain).connect(masterGain);

            osc.start(startTime);
            osc.stop(startTime + length + 0.05);
        }

        /* =================================
         *       PLAYER CHIME
         *    ================================= */
        const playerChimes = {
            P1: 329.63,
            P2: 392.00
        };

        function playPlayerChime(playerId) {
            unlock();

            const baseFreq = playerChimes[playerId];
            const now = ctx.currentTime;

            blip(baseFreq, now, 0.18, 0.22);
            blip(baseFreq * 2, now + 0.08, 0.12, 0.16);
        }

        /* =================================
         *       VICTORY CHIME
         *    ================================= */
        function playVictoryChime() {
            unlock();

            const now = ctx.currentTime;

            const notes = [392.00, 493.88, 587.33];
            let t = now;

            for (let repeat = 0; repeat < 3; repeat++) {

                blip(notes[0], t, 0.14, 0.30);
                blip(notes[1], t + 0.14, 0.14, 0.30);
                blip(notes[2], t + 0.28, 0.20, 0.34);
                blip(notes[2] * 2, t + 0.28, 0.20, 0.28);

                t += 0.62;
            }
        }

        /* =================================
         *       ATARI JINGLE (LOOPING)
         *    ================================= */
        function startJingle() {
            unlock();
            if (isJinglePlaying || !isSoundEnabled) return; // Respect muted state

            // 🔥 restore volume after fade if sound is enabled
            masterGain.gain.cancelScheduledValues(ctx.currentTime);
            masterGain.gain.setValueAtTime(isSoundEnabled ? 0.5 : 0.0, ctx.currentTime);

            isJinglePlaying = true;

            const tempo = 120;
            const beat = 60 / tempo;
            const loopBeats = 20;
            const loopLength = beat * loopBeats;

            const melody = [
                523.25, 587.33, 659.25, 587.33,
                523.25, 659.25, 587.33, 523.25,
                659.25, 698.46, 783.99, 698.46,
                659.25, 783.99, 698.46, 659.25,
                587.33, 523.25, 493.88, 523.25
            ];

            const harmony = [
                659.25, 698.46, 783.99, 698.46,
                659.25, 783.99, 698.46, 659.25,
                783.99, 880.00, 987.77, 880.00,
                783.99, 987.77, 880.00, 783.99,
                698.46, 659.25, 587.33, 659.25
            ];

            function scheduleLoop(startTime) {

                for (let i = 0; i < melody.length; i++)
                    blip(melody[i], startTime + i * beat, 0.18, 0.26);

                for (let i = 0; i < harmony.length; i++)
                    blip(harmony[i], startTime + i * beat, 0.18, 0.16);

                for (let i = 0; i < loopBeats / 2; i++)
                    blip(130.81, startTime + i * beat * 2, 0.26, 0.22);

                const twinkleStart = startTime + loopLength - beat * 0.8;
                blip(783.99, twinkleStart, 0.10, 0.22);
                blip(987.77, twinkleStart + 0.12, 0.10, 0.22);
                blip(1174.66, twinkleStart + 0.24, 0.14, 0.20);
            }

            jingleStartTime = ctx.currentTime;
            scheduleLoop(jingleStartTime);

            jingleInterval = setInterval(() => {
                jingleStartTime += loopLength;
                scheduleLoop(jingleStartTime);
            }, loopLength * 1000);
        }

        function stopJingle() {
            if (!isJinglePlaying) return;

            clearInterval(jingleInterval);
            jingleInterval = null;
            isJinglePlaying = false;
        }

        function stopAllAfter(seconds = 2) {

            // Stop future jingle loops
            stopJingle();

            const now = ctx.currentTime;
            const fadeStart = now + seconds - 0.3; // fade during last 0.3s
            const fadeEnd = now + seconds;

            masterGain.gain.cancelScheduledValues(now);
            masterGain.gain.setValueAtTime(masterGain.gain.value, now);

            // Hold volume steady
            masterGain.gain.setValueAtTime(masterGain.gain.value, fadeStart);

            // Smooth fade to silence
            masterGain.gain.exponentialRampToValueAtTime(0.0001, fadeEnd);
        }

        /* =================================
         *       SOUND TOGGLE
         *    ================================= */
        function toggleSound() {
            isSoundEnabled = !isSoundEnabled;
            if (masterGain) {
                masterGain.gain.setValueAtTime(isSoundEnabled ? 0.5 : 0.0, ctx.currentTime);
            }

            if (!isSoundEnabled) {
                stopJingle(); // Stop the background loop completely when muted
            } else {
                // If unmuting while a game is active, restart the jingle
                const overlay = document.getElementById("overlay");
                if (overlay && overlay.style.display === "none" && !isJinglePlaying) {
                    startJingle();
                }
            }
            return isSoundEnabled;
        }

        /* ================================= */

        return {
            unlock,
            playPlayerChime,
            playVictoryChime,
            startJingle,
            stopJingle,
            stopAllAfter,
            toggleSound
        };

    })();

    function computerChooseMove() {
        // Step 1: Gather Info & Update Position Tracking
        getAssumedP1Pos();

        const P2Corner = { row: 5, col: 5 };
        const P1Corner = { row: 0, col: 0 };

        // Use actual/assumed P1 position consistently
        let targetPos = assumedP1Pos;

        // Distance metrics (accounting for one-way doors)
        let distP1ToP2Corner = getDistance(targetPos, P2Corner);
        let distP2ToP1Corner = getDistance(players.P2, P1Corner);
        let distP2P1 = getDistance(players.P2, targetPos);

        // Step 2: Immediate Winning / Attack Checks
        // Direct Manhattan distance for adjacent attack check (no doors)
        let directDistP2P1 = Math.abs(players.P2.row - targetPos.row) + Math.abs(players.P2.col - targetPos.col);

        if (directDistP2P1 <= 2 && !players.P1.camouflaged) {
            return "btn-p2-attack"; // Attack to win
        }

        // Winning corner proximity checks for P2
        if (players.P2.row === 0 && players.P2.col === 1) { return "btn-p2-left"; }
        if (players.P2.row === 1 && players.P2.col === 0) { return "btn-p2-up"; }

        // Door proximity patch: prevent P2 from blindly walking into doors when too close
        if (distP2P1 <= 2) {
            if (players.P2.row === 3 && players.P2.col === 5) { return "btn-p2-left"; }
            if (players.P2.row === 0 && players.P2.col === 2) { return "btn-p2-left"; }
            if (players.P2.row === 5 && players.P2.col === 2) { return "btn-p2-right"; }
            if (players.P2.row === 3 && players.P2.col === 0) { return "btn-p2-up"; }
        }

        // Step 3: Camouflage Interaction States
        if (directDistP2P1 <= 2 && players.P1.camouflaged) {
            let rand = Math.random();

            if (players.P2.glows > 0) {
                // Glow: 50%, Attack: 25%, Camouflage: 25%
                if (rand < 0.5) return "btn-p2-glow";
                return rand < 0.75 ? "btn-p2-attack" : "btn-p2-camouflage";
            } else {
                // Attack: 50%, Camouflage: 50% (since glows are out)
                return rand < 0.5 ? "btn-p2-attack" : "btn-p2-camouflage";
            }
        }

        if (distP2P1 === 3 && players.P1.camouflaged) {
            let possibleChosenKey = null;
            let count = 0;
            const possibleDirections = [
                { row: -1, col: 0, key: "btn-p2-up" },
                { row: 1, col: 0, key: "btn-p2-down" },
                { row: 0, col: -1, key: "btn-p2-left" },
                { row: 0, col: 1, key: "btn-p2-right" }
            ];

            while (possibleChosenKey == null && count < 20) {
                const possibleDir = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
                const possibleNewRow = players.P2.row + possibleDir.row;
                const possibleNewCol = players.P2.col + possibleDir.col;

                if (possibleNewRow >= 0 && possibleNewRow < gridSize && possibleNewCol >= 0 && possibleNewCol < gridSize && grid[possibleNewRow][possibleNewCol] === players.P2.camouflagedColor) {
                    possibleChosenKey = possibleDir.key;
                }
                count++;
            }

            let moveChoices = [0]; // Remain still
            if (possibleChosenKey != null) {
                moveChoices.push(1, 1); // Move randomly while camouflaged
            }

            let moveSelect = Math.floor(Math.random() * moveChoices.length);
            return moveChoices[moveSelect] === 0 ? "btn-p2-camouflage" : possibleChosenKey;
        }

        if (distP2P1 === 3) {
            let randomNumber = Math.random();
            return randomNumber < 0.7 ? "btn-p2-camouflage" : "btn-p2-glow";
        }

        // Step 4: Strategic Race vs. Hunt Logic
        if (distP1ToP2Corner <= distP2ToP1Corner) {
            return moveToward(players.P2, targetPos);
        }

        if (distP1ToP2Corner > distP2ToP1Corner) {
            return moveToward(players.P2, P1Corner);
        }

        // Step 5: Fallback Random Movement
        const directions = [
            { row: -1, col: 0, key: "btn-p2-up" },
            { row: 1, col: 0, key: "btn-p2-down" },
            { row: 0, col: -1, key: "btn-p2-left" },
            { row: 0, col: 1, key: "btn-p2-right" }
        ];

        let chosenKey = null;
        while (!chosenKey) {
            const dir = directions[Math.floor(Math.random() * directions.length)];
            const newRow = players.P2.row + dir.row;
            const newCol = players.P2.col + dir.col;

            if (newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize) {
                chosenKey = dir.key;
            }
        }

        return chosenKey;
    }

    function getDistance(a, b) {
        // Standard Manhattan distance
        let normalDist = Math.abs(a.row - b.row) + Math.abs(a.col - b.col);

        // Check orange door warp
        let viaP1ToOrangeDoor =
            Math.abs(a.row - 0) + Math.abs(a.col - 2) + // to top orange door
            Math.abs(b.row - 2) + Math.abs(b.col - 2) + 1; // out middle orange cell (+1 warp step)

        // Check purple door warp
        let viaP1ToPurpleDoor =
            Math.abs(a.row - 3) + Math.abs(a.col - 5) + // to right purple door
            Math.abs(b.row - 2) + Math.abs(b.col - 3) + 1; // out middle purple cell (+1 warp step)

        // Check red door warp
        let viaP1ToRedDoor =
            Math.abs(a.row - 5) + Math.abs(a.col - 2) + // to bottom red door
            Math.abs(b.row - 3) + Math.abs(b.col - 3) + 1; // out middle red cell (+1 warp step)

        // Check blue door warp
        let viaP1ToBlueDoor =
            Math.abs(a.row - 3) + Math.abs(a.col - 0) + // to left blue door
            Math.abs(b.row - 3) + Math.abs(b.col - 2) + 1; // out left blue cell (+1 warp step)

        // Return the shortest possible path
        //console.log("normalDist",normalDist);
        //console.log("viaP1ToOrangeDoor",viaP1ToOrangeDoor);
        //console.log("viaP1ToPurpleDoor",viaP1ToPurpleDoor);
        //console.log("viaP1ToRedDoor",viaP1ToRedDoor);
        //console.log("viaP1ToBlueDoor",viaP1ToBlueDoor);
        return Math.min(normalDist, viaP1ToOrangeDoor, viaP1ToPurpleDoor, viaP1ToRedDoor, viaP1ToBlueDoor);
    }



    function getAssumedP1Pos() {
        //Originally made more complicated with a "zone of uncertainty". But I think
        //this simplified approach of just setting assumedP1Pos = lastKnownP1Pos is better. Not sure...
        //
        //we will work with 5 different cell locations: center, up, down, right, and left.
        //Similar to a clock, center = 0, up = 12, down = 6, right = 3, left = 9

        lastKnownP1Pos = {
            row: players.P1.row,
            col: players.P1.col
        };
        assumedP1Pos = lastKnownP1Pos;
    }


    function moveToward(a, b) {
        //a = P2, b = target

        // Standard Manhattan distance
        let normalDist = Math.abs(a.row - b.row) + Math.abs(a.col - b.col);

        // Check orange door warp
        let viaP2ToOrangeDoor =
            Math.abs(a.row - 0) + Math.abs(a.col - 2) + // to top orange door
            Math.abs(b.row - 2) + Math.abs(b.col - 2) + 1; // out middle orange cell (+1 warp step)

        // Check purple door warp
        let viaP2ToPurpleDoor =
            Math.abs(a.row - 3) + Math.abs(a.col - 5) + // to right purple door
            Math.abs(b.row - 2) + Math.abs(b.col - 3) + 1; // out middle purple cell (+1 warp step)

        // Check red door warp
        let viaP2ToRedDoor =
            Math.abs(a.row - 5) + Math.abs(a.col - 2) + // to bottom red door
            Math.abs(b.row - 3) + Math.abs(b.col - 3) + 1; // out middle red cell (+1 warp step)

        // Check blue door warp
        let viaP2ToBlueDoor =
            Math.abs(a.row - 3) + Math.abs(a.col - 0) + // to left blue door
            Math.abs(b.row - 3) + Math.abs(b.col - 2) + 1; // out left blue cell (+1 warp step)

        // Return the shortest possible path
        //console.log("normalDist",normalDist);
        //console.log("viaP1ToOrangeDoor",viaP1ToOrangeDoor);
        //console.log("viaP1ToPurpleDoor",viaP1ToPurpleDoor);
        //console.log("viaP1ToRedDoor",viaP1ToRedDoor);
        //console.log("viaP1ToBlueDoor",viaP1ToBlueDoor);
        let target = Math.min(normalDist, viaP2ToOrangeDoor, viaP2ToPurpleDoor, viaP2ToRedDoor, viaP2ToBlueDoor);

        let rowDiff = b.row - a.row;
        let colDiff = b.col - a.col;
        //8 position states, N,NE,E,SE,S,SW,W,NW
        switch (target) {
            case normalDist:
                if (rowDiff == 0 && colDiff > 0) { //Target is due East of P2
                    return "btn-p2-right" //P2 moves East
                }
                if (rowDiff == 0 && colDiff < 0) { //Target is due West of P2
                    return "btn-p2-left" //P2 moves West
                }
                if (rowDiff < 0 && colDiff == 0) { //Target is due North of P2
                    return "btn-p2-up" //P2 moves North
                }
                if (rowDiff > 0 && colDiff == 0) { //Target is due South of P2
                    return "btn-p2-down" //P2 moves South
                }
                if (rowDiff < 0 && colDiff > 0) { //Target is North East of P2
                    //In most cases, probably want to move east. Not sure though...
                    if (Math.random() < 0.25) {
                        return "btn-p2-up" //P2 moves North
                    } else {
                        return "btn-p2-right"; //P2 moves East
                    }

                }
                if (rowDiff < 0 && colDiff < 0) { //Target is North West of P2
                    //In most cases, probably want to move North. Not sure though...
                    if (Math.random() < 0.25) {
                        return "btn-p2-left" //P2 moves West
                    } else {
                        return "btn-p2-up"; //P2 moves North
                    }

                }

                if (rowDiff > 0 && colDiff < 0) { //Target is South West of P2
                    //In most cases, probably want to move South. Not sure though...
                    if (Math.random() < 0.25) {
                        return "btn-p2-left" //P2 moves West
                    } else {
                        return "btn-p2-down"; //P2 moves South
                    }

                }

                if (rowDiff > 0 && colDiff > 0) { //Target is South East of P2
                    //In most cases, probably want to move East. Not sure though...
                    if (Math.random() < 0.25) {
                        return "btn-p2-down" //P2 moves South
                    } else {
                        return "btn-p2-right"; //P2 moves East
                    }

                }

                break;
            case viaP2ToOrangeDoor:
                if (a.col == 2 && a.row == 0) { //close to winning corner, move toward winning corner
                    return "btn-p2-left";
                }
                //Otherwise, behave like normal distance case
                if (rowDiff == 0 && colDiff > 0) { //Target is due East of P2
                    return "btn-p2-right" //P2 moves East
                }
                if (rowDiff == 0 && colDiff < 0) { //Target is due West of P2
                    return "btn-p2-left" //P2 moves West
                }
                if (rowDiff < 0 && colDiff == 0) { //Target is due North of P2
                    return "btn-p2-up" //P2 moves North
                }
                if (rowDiff > 0 && colDiff == 0) { //Target is due South of P2
                    return "btn-p2-down" //P2 moves South
                }
                if (rowDiff < 0 && colDiff > 0) { //Target is North East of P2
                    //In most cases, probably want to move east. Not sure though...
                    if (Math.random() < 0.25) {
                        return "btn-p2-up" //P2 moves North
                    } else {
                        return "btn-p2-right"; //P2 moves East
                    }

                }
                if (rowDiff < 0 && colDiff < 0) { //Target is North West of P2
                    //In most cases, probably want to move North. Not sure though...
                    if (Math.random() < 0.25) {
                        return "btn-p2-left" //P2 moves West
                    } else {
                        return "btn-p2-up"; //P2 moves North
                    }

                }

                if (rowDiff > 0 && colDiff < 0) { //Target is South West of P2
                    //In most cases, probably want to move South. Not sure though...
                    if (Math.random() < 0.25) {
                        return "btn-p2-left" //P2 moves West
                    } else {
                        return "btn-p2-down"; //P2 moves South
                    }

                }

                if (rowDiff > 0 && colDiff > 0) { //Target is South East of P2
                    //In most cases, probably want to move East. Not sure though...
                    if (Math.random() < 0.25) {
                        return "btn-p2-down" //P2 moves South
                    } else {
                        return "btn-p2-right"; //P2 moves East
                    }

                }

                break;
            case viaP2ToPurpleDoor:
                if (a.col == 5 && a.row > 3) {
                    return "btn-p2-up"; //move from lower right corner towards purple door
                }
                if ((a.col == 5 && a.row == 3) && (b.row == 2 && b.col == 2)) {
                    return "btn-p2-camouflage"; //go through the purple door
                }
                if ((a.col == 5 && a.row == 3) && (b.row != 2 || b.col != 2)) {
                    return "btn-p2-right"; //go through the purple door
                }
                //Otherwise, behave like normal distance case
                if (rowDiff == 0 && colDiff > 0) { //Target is due East of P2
                    return "btn-p2-right" //P2 moves East
                }
                if (rowDiff == 0 && colDiff < 0) { //Target is due West of P2
                    return "btn-p2-left" //P2 moves West
                }
                if (rowDiff < 0 && colDiff == 0) { //Target is due North of P2
                    return "btn-p2-up" //P2 moves North
                }
                if (rowDiff > 0 && colDiff == 0) { //Target is due South of P2
                    return "btn-p2-down" //P2 moves South
                }
                if (rowDiff < 0 && colDiff > 0) { //Target is North East of P2
                    //In most cases, probably want to move east. Not sure though...
                    if (Math.random() < 0.25) {
                        return "btn-p2-up" //P2 moves North
                    } else {
                        return "btn-p2-right"; //P2 moves East
                    }

                }
                if (rowDiff < 0 && colDiff < 0) { //Target is North West of P2
                    //In most cases, probably want to move North. Not sure though...
                    if (Math.random() < 0.25) {
                        return "btn-p2-left" //P2 moves West
                    } else {
                        return "btn-p2-up"; //P2 moves North
                    }

                }

                if (rowDiff > 0 && colDiff < 0) { //Target is South West of P2
                    //In most cases, probably want to move South. Not sure though...
                    if (Math.random() < 0.25) {
                        return "btn-p2-left" //P2 moves West
                    } else {
                        return "btn-p2-down"; //P2 moves South
                    }

                }

                if (rowDiff > 0 && colDiff > 0) { //Target is South East of P2
                    //In most cases, probably want to move East. Not sure though...
                    if (Math.random() < 0.25) {
                        return "btn-p2-down" //P2 moves South
                    } else {
                        return "btn-p2-right"; //P2 moves East
                    }

                }

                break;
            case viaP2ToRedDoor:
                if (a.col > 2 && a.row == 5) {
                    return "btn-p2-left"; //move from lower right corner towards red door
                }
                if (a.col == 2 && a.row == 5) {
                    return "btn-p2-down"; //go through the red door
                }
                //Otherwise, behave like normal distance case
                if (rowDiff == 0 && colDiff > 0) { //Target is due East of P2
                    return "btn-p2-right" //P2 moves East
                }
                if (rowDiff == 0 && colDiff < 0) { //Target is due West of P2
                    return "btn-p2-left" //P2 moves West
                }
                if (rowDiff < 0 && colDiff == 0) { //Target is due North of P2
                    return "btn-p2-up" //P2 moves North
                }
                if (rowDiff > 0 && colDiff == 0) { //Target is due South of P2
                    return "btn-p2-down" //P2 moves South
                }
                if (rowDiff < 0 && colDiff > 0) { //Target is North East of P2
                    //In most cases, probably want to move east. Not sure though...
                    if (Math.random() < 0.25) {
                        return "btn-p2-up" //P2 moves North
                    } else {
                        return "btn-p2-right"; //P2 moves East
                    }

                }
                if (rowDiff < 0 && colDiff < 0) { //Target is North West of P2
                    //In most cases, probably want to move North. Not sure though...
                    if (Math.random() < 0.25) {
                        return "btn-p2-left" //P2 moves West
                    } else {
                        return "btn-p2-up"; //P2 moves North
                    }

                }

                if (rowDiff > 0 && colDiff < 0) { //Target is South West of P2
                    //In most cases, probably want to move South. Not sure though...
                    if (Math.random() < 0.25) {
                        return "btn-p2-left" //P2 moves West
                    } else {
                        return "btn-p2-down"; //P2 moves South
                    }

                }

                if (rowDiff > 0 && colDiff > 0) { //Target is South East of P2
                    //In most cases, probably want to move East. Not sure though...
                    if (Math.random() < 0.25) {
                        return "btn-p2-down" //P2 moves South
                    } else {
                        return "btn-p2-right"; //P2 moves East
                    }

                }
                break;
            case viaP2ToBlueDoor:
                if (a.col == 0 && a.row == 3) { //close to winning corner, move toward winning corner
                    return "btn-p2-up";
                }
                //Otherwise, behave like normal distance case
                if (rowDiff == 0 && colDiff > 0) { //Target is due East of P2
                    return "btn-p2-right" //P2 moves East
                }
                if (rowDiff == 0 && colDiff < 0) { //Target is due West of P2
                    return "btn-p2-left" //P2 moves West
                }
                if (rowDiff < 0 && colDiff == 0) { //Target is due North of P2
                    return "btn-p2-up" //P2 moves North
                }
                if (rowDiff > 0 && colDiff == 0) { //Target is due South of P2
                    return "btn-p2-down" //P2 moves South
                }
                if (rowDiff < 0 && colDiff > 0) { //Target is North East of P2
                    //In most cases, probably want to move east. Not sure though...
                    if (Math.random() < 0.25) {
                        return "btn-p2-up" //P2 moves North
                    } else {
                        return "btn-p2-right"; //P2 moves East
                    }

                }
                if (rowDiff < 0 && colDiff < 0) { //Target is North West of P2
                    //In most cases, probably want to move North. Not sure though...
                    if (Math.random() < 0.25) {
                        return "btn-p2-left" //P2 moves West
                    } else {
                        return "btn-p2-up"; //P2 moves North
                    }

                }

                if (rowDiff > 0 && colDiff < 0) { //Target is South West of P2
                    //In most cases, probably want to move South. Not sure though...
                    if (Math.random() < 0.25) {
                        return "btn-p2-left" //P2 moves West
                    } else {
                        return "btn-p2-down"; //P2 moves South
                    }

                }

                if (rowDiff > 0 && colDiff > 0) { //Target is South East of P2
                    //In most cases, probably want to move East. Not sure though...
                    if (Math.random() < 0.25) {
                        return "btn-p2-down" //P2 moves South
                    } else {
                        return "btn-p2-right"; //P2 moves East
                    }

                }

                break;

        }

    }


    function handleButtonInput(actionKey, btnEl) {
        if (gameOver) return;
        if (btnEl.disabled) return;

        btnEl.classList.add("pressed");
        setTimeout(() => btnEl.classList.remove("pressed"), 150);

        const success = processActionKey(actionKey);
        if (success !== 1) return;

        if (isOnePlayer) {
            // Disable P1 controls while AI thinks
            setP1ButtonsDisabled(true);

            setTimeout(() => {
                let aiKey = computerChooseMove();
                processActionKey(aiKey);

                if (!gameOver) {
                    // Re-enable ONLY P1 controls (P2 stays locked out)
                    setP1ButtonsDisabled(false);

                    // Keep P1 glow button disabled if out of glows
                    if (players.P1.glows <= 0) {
                        const p1GlowBtn = document.getElementById('btn-p1-glow');
                        if (p1GlowBtn) p1GlowBtn.disabled = true;
                    }
                }
            }, 500);
        } else {
            // Two-Player Mode: Switch turn states
            if (actionKey.startsWith("btn-p1-")) {
                setP1ButtonsDisabled(true);
                setP2ButtonsDisabled(false);

                if (players.P2.glows <= 0) {
                    const p2GlowBtn = document.getElementById('btn-p2-glow');
                    if (p2GlowBtn) p2GlowBtn.disabled = true;
                }
            } else if (actionKey.startsWith("btn-p2-")) {
                setP1ButtonsDisabled(false);
                setP2ButtonsDisabled(true);

                if (players.P1.glows <= 0) {
                    const p1GlowBtn = document.getElementById('btn-p1-glow');
                    if (p1GlowBtn) p1GlowBtn.disabled = true;
                }
            }
        }
    }
    function processActionKey(actionKey) {
        if (gameOver) return;
        let isMoveSuccessful = 0;

        if (currentPlayer === "P1") {
            //Player 1 acts
            isMoveSuccessful = processPlayerMove(actionKey);
            if (isMoveSuccessful == 0) return 0;
            //switchTurns();

            //console.log("p1CamouflageTurns",p1CamouflageTurns);
        } else {
            isMoveSuccessful = processPlayerMove(actionKey);
            if (isMoveSuccessful == 0) return 0;
            //switchTurns();
        }

        switchTurns();
        renderGrid();
        return 1;
    }
    // Updated switchTurns function to update UI state
    function switchTurns() {
        if (!gameOver) {
            currentPlayer = (currentPlayer === "P1") ? "P2" : "P1";
            updateButtonStates();
        }
    }

    function updateGlowButton(playerKey) {
        if (playerKey === "P1") {
            const p1GlowBtn = document.getElementById('btn-p1-glow');
            if (p1GlowBtn) {
                const p1Remaining = Math.max(0, players.P1.glows);
                p1GlowBtn.textContent = '💡'.repeat(p1Remaining);
                if (p1Remaining <= 0) {
                    p1GlowBtn.disabled = true;
                }
            }
        } else if (playerKey === "P2") {
            const p2GlowBtn = document.getElementById('btn-p2-glow');
            if (p2GlowBtn) {
                const p2Remaining = Math.max(0, players.P2.glows);
                p2GlowBtn.textContent = '💡'.repeat(p2Remaining);
                if (p2Remaining <= 0) {
                    p2GlowBtn.disabled = true;
                }
            }
        }
    }
    function updateButtonStates() {
        // Select containers or button groups for P1 and P2
        const p1Buttons = document.querySelectorAll(".p1-control-btn");
        const p2Buttons = document.querySelectorAll(".p2-control-btn");
        const soundBtn = document.getElementById("sound-btn");

        if (gameOver) {
            // Disable both control sets and the sound button if game is over
            p1Buttons.forEach(btn => btn.disabled = true);
            p2Buttons.forEach(btn => btn.disabled = true);
            soundBtn.disabled = true;
            return;
        }

        // Ensure sound button is enabled during active gameplay
        if (soundBtn) soundBtn.disabled = false;

        if (currentPlayer === "P1") {
            p1Buttons.forEach(btn => btn.disabled = false);
            p2Buttons.forEach(btn => btn.disabled = true);
        } else {
            p1Buttons.forEach(btn => btn.disabled = true);
            p2Buttons.forEach(btn => btn.disabled = false);
        }
    }




    // --- Query all movement and action buttons across both player panels ---
    const gameButtons = document.querySelectorAll(
        "#btn-p1-up, #btn-p1-down, #btn-p1-left, #btn-p1-right, #btn-p1-camouflage, #btn-p1-glow, #btn-p1-attack, " +
        "#btn-p2-up, #btn-p2-down, #btn-p2-left, #btn-p2-right, #btn-p2-camouflage, #btn-p2-glow, #btn-p2-attack"
    );

    function setGameButtonsDisabled(disabled) {
        gameButtons.forEach(btn => {
            btn.disabled = disabled;
        });
    }

    // Select P1 and P2 button nodes separately
    const p1Buttons = document.querySelectorAll(
        "#btn-p1-up, #btn-p1-down, #btn-p1-left, #btn-p1-right, #btn-p1-camouflage, #btn-p1-glow, #btn-p1-attack"
    );

    const p2Buttons = document.querySelectorAll(
        "#btn-p2-up, #btn-p2-down, #btn-p2-left, #btn-p2-right, #btn-p2-camouflage, #btn-p2-glow, #btn-p2-attack"
    );

    // Toggle Player 1 buttons
    function setP1ButtonsDisabled(disabled) {
        p1Buttons.forEach(btn => {
            btn.disabled = disabled;
        });
    }

    // Toggle Player 2 buttons
    function setP2ButtonsDisabled(disabled) {
        p2Buttons.forEach(btn => {
            btn.disabled = disabled;
        });
    }

    document.getElementById("sound-btn").addEventListener("click", () => {
        const soundOn = AudioEngine.toggleSound();
        document.getElementById("sound-btn").textContent = soundOn ? "🔊" : "🔇";
    });
    // Player 1
    document.getElementById("btn-p1-up").addEventListener("click", (e) => handleButtonInput("btn-p1-up", e.currentTarget));
    document.getElementById("btn-p1-down").addEventListener("click", (e) => handleButtonInput("btn-p1-down", e.currentTarget));
    document.getElementById("btn-p1-left").addEventListener("click", (e) => handleButtonInput("btn-p1-left", e.currentTarget));
    document.getElementById("btn-p1-right").addEventListener("click", (e) => handleButtonInput("btn-p1-right", e.currentTarget));
    document.getElementById("btn-p1-camouflage").addEventListener("click", (e) => handleButtonInput("btn-p1-camouflage", e.currentTarget));
    document.getElementById("btn-p1-glow").addEventListener("click", (e) => handleButtonInput("btn-p1-glow", e.currentTarget));
    document.getElementById("btn-p1-attack").addEventListener("click", (e) => handleButtonInput("btn-p1-attack", e.currentTarget));

    // Player 2
    document.getElementById("btn-p2-up").addEventListener("click", (e) => handleButtonInput("btn-p2-up", e.currentTarget));
    document.getElementById("btn-p2-down").addEventListener("click", (e) => handleButtonInput("btn-p2-down", e.currentTarget));
    document.getElementById("btn-p2-left").addEventListener("click", (e) => handleButtonInput("btn-p2-left", e.currentTarget));
    document.getElementById("btn-p2-right").addEventListener("click", (e) => handleButtonInput("btn-p2-right", e.currentTarget));
    document.getElementById("btn-p2-camouflage").addEventListener("click", (e) => handleButtonInput("btn-p2-camouflage", e.currentTarget));
    document.getElementById("btn-p2-glow").addEventListener("click", (e) => handleButtonInput("btn-p2-glow", e.currentTarget));
    document.getElementById("btn-p2-attack").addEventListener("click", (e) => handleButtonInput("btn-p2-attack", e.currentTarget));

    document.getElementById("begin-btn-2Player").addEventListener("click", () => {
        document.getElementById("overlay").style.display = "none";
        // 🎵 Later, you can also start your game music here
        //bgAudio.play();
        isOnePlayer = false;
        AudioEngine.unlock();
        AudioEngine.stopJingle();
        AudioEngine.startJingle();
        renderGrid();
        setP1ButtonsDisabled(false);
        setP2ButtonsDisabled(true);

    });


    document.getElementById("begin-btn-1Player").addEventListener("click", () => {
        document.getElementById("overlay").style.display = "none";
        // 🎵 Later, you can also start your game music here
        //bgAudio.play();
        isOnePlayer = true;
        AudioEngine.unlock();
        AudioEngine.stopJingle();
        AudioEngine.startJingle();
        renderGrid();
        if (isOnePlayer) {
            // 🔒 Lock Player 2's side completely in 1-player mode
            setP1ButtonsDisabled(false);
            setP2ButtonsDisabled(true);
        } else {
            // 2-Player mode starts with P1 active and P2 disabled
            setP1ButtonsDisabled(false);
            setP2ButtonsDisabled(true);
        }
    });
    document.getElementById("reset-btn").addEventListener("click", resetGame);
