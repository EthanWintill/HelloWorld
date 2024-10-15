//function to get /users list
export function getWords() {
  return fetch('http://127.0.0.1:8000/words/', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    }
  })
  .then(res => res.json())
}