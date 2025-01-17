record session {
  public name: string
  @js:only(private fetcher: @js:fetcher)
}

async function call-api (
  session: &session,
  path: string,
  @js:only(fetcher: @js:fetcher)
) -> void {
  var response = await @fetch(
    url: "https://github.com" + path,
  )

  var text = @bytesToUtf8(response);
  print(text);

  var response = await @fetch(
    url: "https://github.com" + path,
    @js:only(fetcher: session.fetcher)
  )

  var text = @bytesToUtf8(response);
  print(text);
}

function create-session (name: string, @js:only(fetcher: @js:fetcher)) -> session {
  return session {
    name: name,
    @js:only(fetcher: fetcher)
  }
}
