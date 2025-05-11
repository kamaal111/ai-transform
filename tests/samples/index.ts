export const TEST_SOURCE = `
// Calculate the sum of all even numbers in an array
function sumEvens(arr) {
  let total = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] % 2 === 0) {
      total += arr[i];
    }
  }
  return total;
}
`;

export const TEST_PROMPT =
  'Refactor this to use array methods (filter + reduce)';

export const TEST_FAKE_API_KEY = 'fake-api-key';

export const TEST_TRANSFORMATION_RESPONSE = `
// Calculate the sum of all even numbers in an array
function sumEvens(arr) {
  return arr
    .filter(num => num % 2 === 0)
    .reduce((total, num) => total + num, 0);
}
`;
