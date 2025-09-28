import React, { Component, MouseEvent, ChangeEvent } from "react";
import { card, parseCard } from './card';
import "./style.css";

type PracticeProps = {
  initDeck: string, // name of the deck currently being practiced
  onScore: () => void  // callback function to go to score page
}
  
type PracticeState = {
  correct: number,  // number of correct cards so far
  currCard: number,  // number of cards that were practiced
  totalCards: number,  // number of total cards in the deck
  isFront: boolean,  // is the player viewing the front or back of the card
  cards: card[] | undefined,  // array of all the cards in the deck
  deckName: string,  // name of the deck being practiced
  playerName: string,  // name of the player
  requestedSentence: boolean // did the player request a sentence
  AISentence: string | undefined // sentence created by the AI
}

/** Displays the UI of the Practice Card page. */
export class PracticeCards extends Component<PracticeProps, PracticeState> {

  constructor(props: PracticeProps) {
    super(props);
    this.state = {correct: 0, currCard: 0, totalCards: -1, isFront: true, 
                  cards: undefined, deckName: this.props.initDeck, playerName: "", 
                  requestedSentence: false, AISentence: undefined};
  }

  // load in the cards associated with the deck name
  componentDidMount = (): void => {
    this.doRefreshClick();  // initiate a fetch to load in our list of cards
  };

  // renders UI of the page
  render = (): JSX.Element => {
    if (this.state.cards === undefined) {
      return(<div>loading....</div>);
    } else if (this.state.currCard === this.state.totalCards) {
      // they finished practicing
      return (
        <div>
          <h1>Congrats! You've reached the end of deck.</h1>
          <h2>Deck Name: {this.state.deckName}</h2>
          <h3>Correct: {this.state.correct}</h3>
          <h3>Incorrect: {this.state.currCard - this.state.correct}</h3>
          <p>Your Name:
            <input type="text"
              value={this.state.playerName}
              onChange={this.doNameChange} />
            <button type="button" onClick={this.doFinishClick}>Finish</button>
          </p>
        </div>
      );
    } else if (this.state.isFront) {
      // they're looking at the front of the card
      return (
        <div>
          <h1>Let's Practice {this.state.deckName}!</h1>
          <h3>Correct: {this.state.correct}</h3>
          <h3>Incorrect: {this.state.currCard - this.state.correct}</h3>
          <p>You've completed {this.state.currCard} out of {this.state.totalCards} cards. Click on the card to flip it over.</p>
          <button type="button" className="card" onClick={this.doFlipClick}>{this.state.cards[this.state.currCard].front}</button>
          <br/>
          {this.renderAISentence()}
          <p>WARNING: all progress will be lost if page is refreshed...</p>
        </div>
      );
    } else {
      // they're looking at the back of the card
      return (
        <div>
          <h1>Let's Practice {this.state.deckName}!</h1>
          <h3>Correct: {this.state.correct}</h3>
          <h3>Incorrect: {this.state.currCard - this.state.correct}</h3>
          <p>You've completed {this.state.currCard} out of {this.state.totalCards} cards. Click on the card to flip it over.</p>
          <button type="button" className="card" onClick={this.doFlipClick}>{this.state.cards[this.state.currCard].back}</button>
          <br/>
          <br/>
          Did you get it correct? :O &nbsp; &nbsp;
          <button style={{background:"green", color: "white"}} type="button" onClick={this.doCorrectClick}>Yes</button> &nbsp;
          <button style={{background:"red", color: "white"}} type="button" onClick={this.doIncorrectClick}>No :(</button>
          <br></br>
          <p>WARNING: all progress will be lost if page is refreshed...</p>
        </div>
      );
    }
  };

  // Make fetch request to load in the deck
  doRefreshClick = (): void => {
    const url = "/api/loadDeck?name=" + encodeURIComponent(this.props.initDeck);
    fetch(url)
      .then(this.doLoadResp)
      .catch(() => this.doLoadError("failed to connect to server"));
  }

  // Render the AI sentence component
  renderAISentence = (): JSX.Element => {
    if (this.state.requestedSentence) {
      if (this.state.AISentence === undefined) {
        return (
        <p>
          <i>Beep Boop! I'm loading your AI Content right now.</i></p>
        )
      } else if (this.state.AISentence === "meow") {
        // word or phrase was invalid
        return (
        <div>
          <p>Uh Oh! The current card is not a valid word or phrase so the AI was unable to generate a sentence.</p>
          <button type="button"
           onClick={this.doSentenceClick}>Close</button>
        </div>
        )
      } else {
        return (
        <div>
          <p>"{this.state.AISentence}"</p>
          <button type="button"
           onClick={this.doDiffSentenceClick}>Give me a different sentence</button>
          <button type="button"
           onClick={this.doSentenceClick}>Close</button> <i>NOTE: This sentence is generated using Gemini AI's free API, so it might be strange or not very good.</i>
          <br/>
        </div>
        )
      }
    }
    return (
    <>
      <br/>
      <button type="button"
            onClick={this.doSentenceClick}>Need a hint? Ask AI to use this word/phrase in a sentence</button>
    </>)
  }

  // parses json response, load errors if unsuccessful
  doLoadResp = (res: Response): void => {
    if (res.status === 200) {
      res.json().then((val) => {
        const cards = this.doParseCardArray(val.cardset);
        if (cards !== undefined) {
          this.setState({cards: cards, totalCards: cards.length});
        }
      })
        .catch(() => this.doLoadError("200 response is not valid JSON"));
    } else if (res.status === 400) {
      res.text().then(this.doLoadError)
        .catch(() => this.doLoadError("400 response is not text"));
    } else {
      this.doLoadError(`bad status code ${res.status}`);
    }
  }

  // error processor for /loadDeck fetch call
  doLoadError = (msg: string): void => {
    console.error(`Error fetching /loadDeck: ${msg}`);
  }
  
  // update user input after every keystroke
  doNameChange = (evt: ChangeEvent<HTMLInputElement>): void => {
    this.setState({playerName: evt.target.value});
  };

  // "flips" the card by setting the state of isFront
  doFlipClick = (_evt: MouseEvent<HTMLButtonElement>): void => {
    if (this.state.isFront) {
      this.setState({isFront: false, AISentence: undefined, requestedSentence: false});
    } else {
      this.setState({isFront: true, AISentence: undefined, requestedSentence: false});
    }
  };

  // generates a sentence using gemini if the user just requested a sentence, otherwise set sentence to be undefined
  doSentenceClick = (_evt: MouseEvent<HTMLButtonElement>): void => {
    if (this.state.requestedSentence) {
      this.setState({AISentence: undefined, requestedSentence: false});
    } else {
      this.setState({requestedSentence: true})
      const currWord = this.state.cards? this.state.cards[this.state.currCard].front : ""
      const url = "/api/getAISentence?tokens=" + encodeURIComponent(currWord);
      fetch(url)
          .then(this.doAIResp)
          .catch(() => this.doAIError("failed to connect to server"));
    }
  };

  // generates a sentence using gemini
  doDiffSentenceClick = (_evt: MouseEvent<HTMLButtonElement>): void => {
    const url = "/api/getAISentence?tokens=" + encodeURIComponent(this.state.cards? this.state.cards[this.state.currCard].front : "");
    fetch(url)
        .then(this.doAIResp)
        .catch(() => this.doAIError("failed to connect to server"));
  };

  // checks that our API call returned a string and saves it to state
  // otherwise throw errors accordingly
  doAIResp = (res: Response): void => {
    if (res.status === 200) {
      res.json()
      .then((val) => {
        const content = val.answer; // parse response
        if (typeof content === 'string') {
          if (content.toLowerCase() === "meow"){
            this.setState({AISentence: "meow"})
          } else {
            this.setState({AISentence: content});
          }
        } else {
          console.error("not a string", val);
        }
      })
      .catch(() => this.doAIError("200 response is not valid JSON"));
    } else if (res.status === 400) {
      res.text().then(this.doAIError)
        .catch(() => this.doAIError("400 response is not text"));
    } else {
      this.doAIError(`bad status code ${res.status}`);
    }
  }

  // error processor for /listDecks fetch call
  doAIError = (msg: string): void => {
    console.error(`Error fetching /getAISentence or /getAnotherAISentence: ${msg}`);
  }

  // update state of number of correct cards
  doCorrectClick = (_evt: MouseEvent<HTMLButtonElement>): void => {
    const curr: number = this.state.currCard + 1;
    const currCorrect: number = this.state.correct + 1;
    this.setState({currCard: curr, correct: currCorrect, isFront: true, AISentence: undefined, requestedSentence: false});
  };

  // update state of number of total cards seen
  doIncorrectClick = (_evt: MouseEvent<HTMLButtonElement>): void => {
    const curr: number = this.state.currCard + 1;
    this.setState({currCard: curr, isFront: true, AISentence: undefined, requestedSentence: false});
  };

  // makes fetch call to record this player's performance (score)
  // which will be diplayed in SeeScore
  doFinishClick = (_evt: MouseEvent<HTMLButtonElement>): void => {
    const finalScore: number = Math.round(100*(this.state.correct / this.state.totalCards));
    const currName = this.state.playerName.trim();
    if (currName.length === 0) {
      alert("What is your name?");
      return;
    }
    const body = {player: this.state.playerName, deck: this.state.deckName, score: finalScore};
    fetch("/api/addScore", {
      method: "POST", body: JSON.stringify(body),
      headers: {"Content-Type": "application/json"} })
      .then(this.doAddResp)
      .catch(() => this.doAddError("failed to connect to server"));
  };

  // checks that we successfully saved the score record
  // outputs error if unsuccessful
  doAddResp = (res: Response): void => {
    if (res.status === 200) {
      // saved successfully!
      res.json().then((val) => {
        if (val.success) {
          // this was a new file that was not on server previously
          // add to list of files to be rendered!
          this.props.onScore();
        } else {
          // should never enter this branch
          this.doAddError(`this should not be possible`);
        }
      })
        .catch(() => this.doAddError("unable to update state"));
    } else if (res.status === 400) {
      res.text().then(this.doAddError)
         .catch(() => this.doAddError("400 response missing param / is not text"));
    } else {
      this.doAddError(`bad status code ${res.status}`);
    }
  };

  // error processor for /addScore fetch call
  doAddError = (msg: string): void => {
    console.error(`Error fetching /addScore: ${msg}`);
  }

   /**
   * Parses unknown data into an array of cards. Will log an error and return
   * undefined if it is not an array of Items.
   * @param val unknown data to parse into an array of Items
   * @return card[] if val is an array of card and undefined otherwise
   */
  doParseCardArray = (val: unknown): undefined | card[] => {
    if (!Array.isArray(val)) {
      console.error("not an array", val);
      return undefined;
    }
    const cards: card[] = [];
    for (const curr of val) {
      const card = parseCard(curr);
      if (card === undefined) {
        return;
      } else {
        cards.push(card);
      }
    }
    return cards;
  };
}
