// Why the page looks the way it does. Plain notes, not a manifesto.
export default function Design() {
  return (
    <section className="method design">
      <h2>Design notes</h2>
      <p>
        The page is a sequence of charts that each make one point, not one chart with a panel of settings. An earlier version let you pick the
        measure, brand and scale, and most of those combinations answered questions nobody was asking. The one control left picks a category,
        because phones and laptops tell different stories.
      </p>
      <p>
        The first chart shows each category as a multiple of its 2012 level. A laptop battery is about ten times a phone battery, so on a shared
        watt-hour axis the phone line would look flat even though it nearly tripled.
      </p>
      <p>
        The bold lines are averages and the faint marks behind them are individual devices. The averages carry the point. The devices are there
        so you can check them: tap one to see the line of text its number came from. Each product line at each size counts once per year in the
        average. I didn’t weight by market share, because a brand’s share is mostly cheaper models that aren’t on this chart.
      </p>
      <p>
        Power draw gets its own chart because it’s the number that separates the two stories. It’s battery size divided by hours. If the
        battery stays the same and the hours go up, the device got more efficient. If both go up together, it just got a bigger battery.
      </p>
      <p>
        The scatter uses log scales on both axes so that lines of constant power draw come out as straight diagonals. Moving along a diagonal
        means a bigger battery. Moving across them means less power.
      </p>
      <p>
        The dashed lines at 100 Wh and 20 Wh are rules, not trends. A battery over 100 Wh needs an airline’s approval to carry on, so laptop
        makers build up to it and stop. Lithium cells over 20 Wh ship as freight under stricter rules, and the biggest phones are now reaching
        that line.
      </p>
      <p>
        Devices are drawn as brand marks so an iPhone and a Galaxy can be told apart without a legend. The Apple logo is an outline because a
        solid one outweighed everything around it. Samsung and Lenovo use the marks from their own website icons, because their full logos are
        wordmarks that don’t read at this size. Filled marks are lab results at a fixed screen brightness; dim or hollow ones are older tests or
        the maker’s own claim. Results measured at different brightness are never adjusted into each other, since brightness alone can move
        battery life by hours.
      </p>
      <p>
        The look follows <a href="https://drewhoover.com/cfb-streak-king/">cfb-streak-king</a>: a dark page, cream for phones, rust for laptops,
        gray for tablets. The charts are drawn with Observable Plot and rendered into the page ahead of time, so they show up before any
        JavaScript runs.
      </p>
    </section>
  )
}
